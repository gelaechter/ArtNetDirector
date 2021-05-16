package io.github.gelaechter;

import com.google.gson.Gson;
import io.github.gelaechter.data.Data;
import io.github.gelaechter.data.Node;
import io.github.gelaechter.data.User;
import io.github.gelaechter.util.Localizer;
import io.github.gelaechter.util.Texts;
import io.javalin.Javalin;
import io.javalin.websocket.WsContext;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

public class WebServer {

    private final ArtNetDirector artNETDirector;

    @Getter
    private Javalin javalinApp;

    //Websocket context of users and admins
    private final Set<WsContext> adminSet = new HashSet<>();
    private final Set<WsContext> userContexts = new HashSet<>();

    private final Logger logger = LoggerFactory.getLogger(WebServer.class);
    final Localizer localizer = ArtNetDirector.getLocalizer();

    // the ips of the admins who successfully completed the password authorization request
    private final Set<String> authorizedAdminIps = new HashSet<>();

    //Store log here
    private String webConsole = "";

    public WebServer(ArtNetDirector artNETDirector) {
        this.artNETDirector = artNETDirector;
    }

    public void start() {
        javalinApp = Javalin.create(config -> {
            config.addStaticFiles("/web/user");
            config.addStaticFiles("/web/admin");
            config.addStaticFiles("/web/fallback");
            config.addStaticFiles("/web");

            config.addSinglePageRoot("/admin", "web/admin/admin.html");
            config.addSinglePageRoot("/kicked", "web/fallback/kicked.html");
            config.addSinglePageRoot("/banned", "web/fallback/banned.html");
            config.addSinglePageRoot("/favicon.ico", "web/favicon.ico");
            config.addSinglePageRoot("/", "web/user/user.html"); // if this page root comes before the others it parsed first and redirects everything to itself, this is probably a bug


            config.showJavalinBanner = false;
        }).start(ArtNetDirector.settings.getWebPort());

        //Starts a socket connection for the ArtNet Director interface
        javalinApp.ws("/users", ws -> {
            ws.onConnect(ctx -> {
                userContexts.add(ctx);

                //Creates a user and gives them their ip
                String ip = getIpByContext(ctx);

                if (ArtNetDirector.settings.getIpBlacklist().contains(ip)) {
                    ctx.send(toJsonArray("BANNED"));
                    ctx.session.close();
                }

                ArtNetDirector.userMap.putIfAbsent(ip, new User(ip));
                ArtNetDirector.userMap.get(ip).setConnected(true);

                ctx.send(toJsonArray("CLIENTIP", ip));
                sendUpdates();
                logger.info("Connected user with ip {}", ip);
            });

            ws.onClose(ctx -> {
                userContexts.remove(ctx);

                String ip = getIpByContext(ctx);

                User user = ArtNetDirector.userMap.get(ip);

                //if there are no open connections set the user to disconnected
                if (Collections.disjoint(userContexts, getUserContexts(user))) {
                    user.setConnected(false);
                }

                ArtNetDirector.userMap.put(ip, user);
                sendUpdates();
                logger.info("Disconnected user with ip {}", ip);
            });

            ws.onMessage(ctx -> {
                //Gets message parts from a websocket message
                String[] message = new Gson().fromJson(ctx.message(), String[].class);

                //forwards message to processing method
                processUserMessage(getUserByContext(ctx), message);

                //and updates the clients
                sendUpdates();
            });
        });

        //Starts a socket connection for the ArtNET Director administrator panel
        javalinApp.ws("/administrators", ws -> {
            ws.onConnect(ctx -> {
                adminSet.add(ctx);

                //If the connecting ip isn't authorized tell it to authorize
                if (!authorizedAdminIps.contains(getIpByContext(ctx))) {
                    ctx.send(toJsonArray("AUTHORIZE"));
                    return;
                }

                sendLog();
                sendUpdates();
            });

            ws.onClose(ctx -> {
                adminSet.remove(ctx);
                sendUpdates();
            });

            ws.onMessage(ctx -> {
                //Gets message parts from a websocket message
                String[] message = new Gson().fromJson(ctx.message(), String[].class);

                //forwards message to processing method
                processAdminMessage(message, ctx);

                //and updates the clients
                sendUpdates();
            });
        });

        //logs all exceptions with the javalin server and sends them
        javalinApp.exception(Exception.class, (e, ctx) -> {
            logger.error(localizer.getLocalizedText(Texts.GENERAL_ERROR), e);
            sendLog();
        });

        //logs all exceptions in the websocket connection and sends them
        javalinApp.wsException(Exception.class, (e, ctx) -> {
            logger.error(localizer.getLocalizedText(Texts.GENERAL_ERROR), e);
            sendLog();
        });

        //refresh webclient log every second
        Timer timer = new Timer();
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                String log = artNETDirector.getLog();
                if (!webConsole.equals(log)) {
                    webConsole = log;
                    sendLog();
                }
            }
        }, 0, 1000);
    }

    //converts objects to json
    private String toJsonArray(Object... args) {
        switch (args[0].getClass().getName()) {
            case "io.github.gelaechter.data.Data":
                return new Gson().toJson(args[0], Data.class);
            case "java.lang.String":
                return new Gson().toJson(args, String[].class);
            default:
                throw new IllegalStateException("Wrong class for json transmission: " + args[0].getClass().getName());
        }
    }

    //sends objects to the user page
    private void sendUsers(Object... args) {
        for (WsContext ctx : userContexts) {
            if (ctx.session.isOpen()) {
                ctx.send(toJsonArray(args));
            }
        }
    }

    //sends objects to the admin page
    private void sendAdmins(Object... args) {
        //copy the admin set into a new set to prevent concurrent modification
        final Set<WsContext> receivingAdmins = new HashSet<>(adminSet);
        for (WsContext ctx : receivingAdmins) {
            if(ctx == null) continue;
            if (authorizedAdminIps.contains(getIpByContext(ctx)) && ctx.session.isOpen()) {
                ctx.send(toJsonArray(args));
            }
        }
    }

    //sends the log to the admin page
    private void sendLog() {
        webConsole = artNETDirector.getLog();
        sendAdmins("LOG", webConsole);
    }

    //process a message from the admin page
    private void processAdminMessage(String[] message, WsContext ctx) {


        final int KEYWORD = 0;
        final int NODENUMBER = 1;
        final int USERIP = 1;
        final int NODENAME = 1;
        final int DATACONTENT = 1;
        final int PASSWORD = 1;
        final int NEWPASSWORD = 1;
        final int NODEIP = 2;
        final int NODEUNIVERSE = 3;
        final int WEBPORT = 1;
        final int USERNAME = 2;

        if(ctx == null) return;

        if (message[KEYWORD] != null) {
            //If the sender isn't authorized and isn't trying to authorize themselves, tell them to do that
            if (!authorizedAdminIps.contains(getIpByContext(ctx)) && !message[KEYWORD].equals("AUTHORIZATION")) {
                ctx.send(toJsonArray("AUTHORIZE"));
                return;
            }

            switch (message[KEYWORD]) {
                case "KICKUSER":
                    kickUser(message[USERIP]);
                    break;
                case "BANUSER":
                    banUser(message[USERIP]);
                    break;
                case "UNBANUSER":
                    unBanUser(message[USERIP]);
                    break;
                case "REMOVENODE":
                    removeNode(Integer.parseInt(message[NODENUMBER]));
                    break;
                case "ADDNODE":
                    addNode(message[NODENAME], message[NODEIP], message[NODEUNIVERSE]);
                    break;
                case "REQUESTDATA":
                    ctx.send(toJsonArray("FILE", artNETDirector.dataToBase64()));
                    break;
                case "LOAD":
                    artNETDirector.loadDataFromBase64(message[DATACONTENT]);
                    break;
                case "AUTHORIZATION":
                    if (message[PASSWORD].equals(ArtNetDirector.settings.getPassword())) {
                        authorizedAdminIps.add(getIpByContext(ctx));
                        ctx.send(toJsonArray("AUTHORIZED"));
                        sendLog();
                        sendUpdates();
                    } else {
                        ctx.send(toJsonArray("WRONGPASSWORD"));
                    }
                    break;
                case "CHANGEPASSWORD":
                    ArtNetDirector.settings.setPassword(message[NEWPASSWORD]);
                    artNETDirector.saveSettings();
                    sendAdmins("PASSWORDCHANGED");
                    authorizedAdminIps.clear();
                    adminSet.clear();
                    logger.info(localizer.getLocalizedText(Texts.ADMIN_PASSWORD_CHANGED), message[NEWPASSWORD]);
                    break;

                case "UPDATEPORTS":
                    artNETDirector.updatePorts(
                            Integer.parseInt(message[WEBPORT])
                    );
                    break;
                case "CHANGEUSERNAME":
                    User user = ArtNetDirector.userMap.get(message[USERIP]);
                    if (user == null || message[USERNAME] == null) return;
                    setUserName(
                            user,
                            message[USERNAME]
                    );
                    break;
                default:
                    break;
            }
        }

    }


    //returns the ip of the connection
    private String getIpByContext(WsContext ctx) {
        if (ctx == null) return null;
        String ip = ctx.session.getRemoteAddress().getAddress().getHostAddress();
        if (ip.equals("0:0:0:0:0:0:0:1")) {
            ip = "127.0.0.1";
        }
        return ip;
    }

    // returns a user with the same ip or a new one
    private User getUserByContext(WsContext ctx) {
        return ArtNetDirector.userMap.get(getIpByContext(ctx));
    }

    //updates the clients
    private void sendUpdates() {
        //creates a SocketData object and sends it to all clients
        Data userData = new Data(ArtNetDirector.userMap, ArtNetDirector.nodes, null);
        Data adminData = new Data(ArtNetDirector.userMap, ArtNetDirector.nodes, ArtNetDirector.settings);

        sendUsers(userData);
        sendAdmins(adminData);
    }

    //process a message sent by a user in the web
    private void processUserMessage(User user, String[] message) {
        final int KEYWORD = 0;
        final int NODENUMBER = 1;
        final int USERNAME = 1;

        if (message[KEYWORD] != null) {
            switch (message[KEYWORD]) {
                case "USERNAME":
                    String username = message[USERNAME];
                    setUserName(user, username);
                    break;
                case "TOGGLENODE":
                    toggleNode(user, Integer.parseInt(message[NODENUMBER]));
                    break;
                default:
                    break;
            }
        }
    }

    //sets the username of a user
    private void setUserName(User user, String userName) {
        user.setUserName(userName);
        ArtNetDirector.userMap.put(user.getIp(), user);
    }

    //adds a new node
    private void addNode(String nodeName, String nodeIp, String nodeUniverse) {
        Node node = new Node(nodeName, nodeIp);
        int universe;
        try {
            universe = Integer.parseInt(nodeUniverse);
        } catch (NumberFormatException ignore) {
            logger.error(localizer.getLocalizedText(Texts.UNIVERSE_PARSE_ERROR), nodeName, nodeUniverse);
            universe = 0;
        }
        node.setUniverse(universe);

        //find the next free number for that node
        int number = 0;
        while (true) {
            if (ArtNetDirector.nodes.containsKey(number)) {
                number++;
            } else {
                ArtNetDirector.nodes.put(number, node);
                break;
            }
        }
        sendUpdates();
    }

    //removes a node
    private void removeNode(int nodeNumber) {
        ArtNetDirector.nodes.remove(nodeNumber);
        for (Map.Entry<String, User> entry : ArtNetDirector.userMap.entrySet()) {
            User user = entry.getValue();
            user.setToggled(nodeNumber, false);
            ArtNetDirector.userMap.put(entry.getKey(), user);
        }
        sendUpdates();
    }

    //redirects the user to a kicked page
    private void kickUser(String ip) {
        //Get the user from the ip and kick all of their instances
        User user = ArtNetDirector.userMap.get(ip);
        for (WsContext ctx : getUserContexts(user)) {
            ctx.send(toJsonArray("KICKED"));
            ctx.session.close();
        }
        ArtNetDirector.userMap.get(ip).setConnected(false);
        sendUpdates();
    }

    //puts a user on the blacklists and redirects them to a ban page
    private void banUser(String ip) {
        //Get the user from the ip and ban all of their instances
        User user = ArtNetDirector.userMap.get(ip);
        for (WsContext ctx : getUserContexts(user)) {
            ctx.send(toJsonArray("BANNED"));
            ctx.session.close();
        }
        ArtNetDirector.userMap.get(ip).setConnected(false);
        ArtNetDirector.settings.getIpBlacklist().add(ip);
        artNETDirector.saveSettings();
        sendUpdates();
    }

    //removes a user ip from the blacklist
    private void unBanUser(String ip) {
        ArtNetDirector.settings.getIpBlacklist().remove(ip);
        sendUpdates();
    }

    //returns all socket contexts of a user
    private List<WsContext> getUserContexts(User user) {
        List<WsContext> contexts = new ArrayList<>();
        for (WsContext ctx : userContexts) {
            String ip = getIpByContext(ctx);
            if (ip != null && ip.equals(user.getIp())) {
                contexts.add(ctx);
            }
        }
        return contexts;
    }

    //toggles a node for a client
    private void toggleNode(User user, int node) {
        //if the user is connected toggle the node status
        user.setToggled(node, !user.isToggled(node));
        ArtNetDirector.userMap.put(user.getIp(), user);
    }

    public void stop() {
        //notify all clients of shutdown
        sendUsers("SERVERSTOP");
        sendAdmins("SERVERSTOP");

        //Disconnect all users
        for (User value : ArtNetDirector.userMap.values()) {
            value.setConnected(false);
        }

        if (javalinApp == null || javalinApp.server() == null) {
            return;
        }

        try {
            javalinApp.server().server().stop();
        } catch (InterruptedException ignore) {
            // InterruptedException will get thrown when the server will be stopped by itself,
            // which happens when it gets stopped via a websocket connection, e.g. by updating the ports from the web ui which causes a restart
        } catch (Exception e) {
            e.printStackTrace();
        }
        javalinApp.stop();
    }

    public void indicateTransmission(String userIp, List<Integer> nodeNumbers) {
        sendUsers("TRANSMITTING", userIp, nodeNumbers);
        sendAdmins("TRANSMITTING", userIp, nodeNumbers);
    }

    // corrects all user connection states, useful after loading a configuration in which currently disconnected users are still noted as connected.
    public void updateUsers() {
        for (User user : ArtNetDirector.userMap.values()) {
            boolean connected = false;
            for (WsContext userContext : getUserContexts(user)) {
                if(userContext.session.isOpen()) connected = true;
            }
            user.setConnected(connected);
        }
        sendUpdates();
    }
}
