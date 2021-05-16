package io.github.gelaechter;

import com.google.gson.Gson;
import io.github.gelaechter.data.Data;
import io.github.gelaechter.data.Node;
import io.github.gelaechter.data.Settings;
import io.github.gelaechter.data.User;
import io.github.gelaechter.util.Localizer;
import io.github.gelaechter.util.Texts;
import io.github.gelaechter.util.UIPrintStream;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.control.TextArea;
import javafx.scene.image.Image;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.*;
import java.io.*;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Main class which manages the ArtNet- and WebServer
 */
public class ArtNetDirector extends Application {

    //Data
    protected static final Map<String, User> userMap = new ConcurrentHashMap<>();
    protected static final Map<Integer, Node> nodes = new HashMap<>();
    protected static Settings settings = new Settings();

    //Servers
    private final ArtNetServer artNetServer = new ArtNetServer(this);
    private final WebServer webServer = new WebServer(this);

    //Utils
    private static final Logger logger = LoggerFactory.getLogger(ArtNetDirector.class);
    @Getter
    private static final Localizer localizer = new Localizer();

    //UI Console
    private final TextArea console = new TextArea();
    private static final String SETTINGS_PATH = "settings.json";

    public static void main(String[] args) {
        launch(args);
    }

    public String getLog() {
        return console.getText();
    }

    @Override
    public void start(Stage stage) {
        try {
            //count start time
            long startTime = System.currentTimeMillis();

            @SuppressWarnings("java:S106")
            //Redirect console to User Interface Console (SonarLint thinks sout is used for logging, so i suppress that)
            PrintStream out = new UIPrintStream(System.out, console);

            System.setOut(out);
            System.setErr(out);

            setupConsole(stage);

            logger.info(localizer.getLocalizedText(Texts.STARTING));

            //Load settings
            loadSettings();

            //Start servers
            artNetServer.start();
            webServer.start();

            logger.info("\n\n     _         _   _   _      _     ____  _               _             \n" +
                    "    / \\   _ __| |_| \\ | | ___| |_  |  _ \\(_)_ __ ___  ___| |_ ___  _ __ \n" +
                    "   / _ \\ | '__| __|  \\| |/ _ \\ __| | | | | | '__/ _ \\/ __| __/ _ \\| '__|\n" +
                    "  / ___ \\| |  | |_| |\\  |  __/ |_  | |_| | | | |  __/ (__| || (_) | |   \n" +
                    " /_/   \\_\\_|   \\__|_| \\_|\\___|\\__| |____/|_|_|  \\___|\\___|\\__\\___/|_|   \n" +
                    "                                                                        ");

            long startupTime = (System.currentTimeMillis() - startTime);
            String javalinPort = String.valueOf(webServer.getJavalinApp().port());
            String hostAddress = getMachineAddress().getHostAddress();

            logger.info(localizer.getLocalizedText(Texts.STARTED_IN_TIME), startupTime);
            logger.info(localizer.getLocalizedText(Texts.CLIENT_ADDRESS), hostAddress, javalinPort);
            logger.info(localizer.getLocalizedText(Texts.ADMIN_ADDRESS), hostAddress, javalinPort);
            logger.info(localizer.getLocalizedText(Texts.ADMIN_PASSWORD), settings.getPassword());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static InetAddress getMachineAddress() throws SocketException, UnknownHostException {
        try (final DatagramSocket socket = new DatagramSocket()) {
            socket.connect(InetAddress.getByName("8.8.8.8"), 10002);
            return socket.getLocalAddress();
        }
    }

    public void setupConsole(Stage stage) {
        //Create root pane
        VBox root = new VBox();

        //Figure out the screen size
        GraphicsDevice gd = GraphicsEnvironment.getLocalGraphicsEnvironment().getDefaultScreenDevice();
        int width = gd.getDisplayMode().getWidth();
        int height = gd.getDisplayMode().getHeight();

        //Create scene that is 900 by 700 or screen size
        Scene scene = new Scene(root, Math.min(width, 900), Math.min(height, 700));

        // anchor pane for console
        AnchorPane consolePane = new AnchorPane();
        VBox.setVgrow(consolePane, Priority.ALWAYS);

        // setup console and add it to its pane
        AnchorPane.setTopAnchor(console, 0.0);
        AnchorPane.setBottomAnchor(console, 0.0);
        AnchorPane.setLeftAnchor(console, 0.0);
        AnchorPane.setRightAnchor(console, 0.0);
        console.setEditable(false);
        console.setStyle("-fx-control-inner-background:#000000; -fx-focus-color: transparent; -fx-font: 1.5em Monospace");
        consolePane.getChildren().add(console);

        // add menu bar and the console to the root pane
        root.getChildren().addAll(consolePane);

        //Redirect exit
        Platform.setImplicitExit(false);
        stage.setOnCloseRequest(event -> {
            stop();
            event.consume();
            stage.setOnCloseRequest(e -> System.exit(0));
        });
        Runtime.getRuntime().addShutdownHook(new Thread(this::stop));


        //prepare and show stage
        stage.setTitle("ArtNet Director Console");
        stage.getIcons().add(new Image(Objects.requireNonNull(getClass().getResourceAsStream("/icon.png"))));
        stage.setScene(scene);
        stage.show();
    }


    @Override
    public void stop() {
        boolean errors;

        //Stop servers
        logger.info(localizer.getLocalizedText(Texts.STOPPING_ARTNET));
        artNetServer.stop();
        logger.info(localizer.getLocalizedText(Texts.STOPPING_WEBSERVER));
        webServer.stop();

        errors = !saveSettings();

        try {
            saveLogFile();
        } catch (IOException e) {
            logger.error(localizer.getLocalizedText(Texts.LOGFILE_ERROR), e);
            errors = true;
        }

        if (errors) {
            logger.error(localizer.getLocalizedText(Texts.SHUTDOWN_ERROR));
        } else {
            //Count down to shutdown
            new Timer().schedule(new TimerTask() {
                int i = 5;

                @Override
                public void run() {
                    if (i == 0) System.exit(0);
                    logger.info(i == 5 ? localizer.getLocalizedText(Texts.COUNTDOWN) : "{}...", i);
                    i--;
                }
            }, 0, 1000);
        }
    }

    public void saveLogFile() throws IOException {
        String folderName = "logs";
        File logsDir = new File("logs" + File.separator);
        if (!logsDir.exists() && !logsDir.mkdirs()) {
            logger.error(localizer.getLocalizedText(Texts.LOGFOLDER_ERROR));
            folderName = "";
        }

        //Create log file
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDateTime now = LocalDateTime.now();
        File logZip = new File(folderName + File.separator + dtf.format(now) + ".log.zip");
        int number = 0;
        while (logZip.exists()) {
            number++;
            logZip = new File(folderName + File.separator + dtf.format(now) + "-" + number + ".log.zip");
        }
        File logFile = new File(logZip.getPath().replace(".zip", ""));

        //Write log file
        try (FileWriter myWriter = new FileWriter(logFile)) {
            myWriter.write(console.getText());
        }

        //Zip log file
        try (ZipOutputStream zos = new ZipOutputStream(
                new FileOutputStream(logZip.getPath()));
             FileInputStream fis = new FileInputStream(logFile)
        ) {

            ZipEntry zipEntry = new ZipEntry(logFile.getName());
            zos.putNextEntry(zipEntry);

            byte[] buffer = new byte[1024];
            int len;
            while ((len = fis.read(buffer)) > 0) {
                zos.write(buffer, 0, len);
            }
            zos.closeEntry();
            zos.flush();
        }

        //delete log file
        Files.delete(logFile.toPath());

        logger.info(localizer.getLocalizedText(Texts.LOGFILE_LOCATION), logZip.getAbsolutePath());
    }


    public static String encodeBase64(String input) {
        return Base64.getEncoder().encodeToString(input.getBytes(StandardCharsets.UTF_8));
    }

    public static String decodeBase64(String input) throws IllegalArgumentException {
        return new String(Base64.getDecoder().decode(input.getBytes()), StandardCharsets.UTF_8);
    }

    //Only to send nodes and users to admin via javascript
    public String dataToBase64() {
        Data data = new Data(userMap, nodes, null);
        String json = new Gson().toJson(data, Data.class);
        return encodeBase64(json);
    }

    //Only to load nodes and users from admin
    public void loadDataFromBase64(String base64) {
        try {
            String json = decodeBase64(base64);


            Data data = new Gson().fromJson(json, Data.class);

            nodes.clear();
            nodes.putAll(data.getNodes());

            userMap.clear();
            userMap.putAll(data.getUserMap());
            webServer.updateUsers();
        } catch (IllegalArgumentException e) {
            logger.error(localizer.getLocalizedText(Texts.FILE_ERROR), e);
        }
    }

    //give the webserver information for indicating a Art-Net transmission
    public void indicateTransmission(User user, List<Node> receivingNodes) {
        List<Integer> nodeNumbers = new ArrayList<>();
        //iterate over all nodes to get the identifying numbers
        for (Node node : receivingNodes) {
            for (Map.Entry<Integer, Node> integerNodeEntry : nodes.entrySet()) {
                if (integerNodeEntry.getValue().equals(node)) {
                    nodeNumbers.add(integerNodeEntry.getKey());
                }
            }
        }

        //pass the information to the webserver
        webServer.indicateTransmission(user.getIp(), nodeNumbers);
    }

    public void updatePorts(int webPort) {
        final int oldValue = settings.getWebPort();
        logger.info(localizer.getLocalizedText(Texts.PORT_CHANGE), webPort);
        webServer.stop();
        settings.setWebPort(webPort);
        this.saveSettings();

        //try starting the server with the new port and revert it if that doesnt work
        try {
            webServer.start();
        } catch (RuntimeException exception) {
            logger.error("", exception);
            logger.error(localizer.getLocalizedText(Texts.PORT_ERROR), webPort, oldValue);

            settings.setWebPort(oldValue);
            this.saveSettings();
            webServer.start();
        }

        // print a new message
        String javalinPort = String.valueOf(webServer.getJavalinApp().port());
        String hostAddress = null;
        try {
            hostAddress = getMachineAddress().getHostAddress();
        } catch (SocketException | UnknownHostException ignored) {
            //Ignore the exceptions
        }

        logger.info(localizer.getLocalizedText(Texts.CLIENT_ADDRESS), hostAddress, javalinPort);
        logger.info(localizer.getLocalizedText(Texts.ADMIN_ADDRESS), hostAddress, javalinPort);
    }

    /**
     * Saves the Settings object with blacklist ports and password to settings.json
     *
     * @return returns true if saving was successful, false if something went wrong
     */
    public boolean saveSettings() {
        String json = new Gson().toJson(settings, Settings.class);
        try (FileWriter myWriter = new FileWriter(SETTINGS_PATH)) {
            myWriter.write(json);
            return true;
        } catch (IOException e) {
            logger.error(localizer.getLocalizedText(Texts.SETTINGS_WRITE_ERROR), e);
            return false;
        }
    }

    public static void loadSettings() {
        File file = new File(SETTINGS_PATH);
        if (!file.exists()) return;

        try (
                FileInputStream fis = new FileInputStream(file);
                DataInputStream dis = new DataInputStream(fis)
        ) {
            if (new File(SETTINGS_PATH).exists()) {
                byte[] data = new byte[(int) file.length()];
                dis.readFully(data);
                settings = new Gson().fromJson(new String(data, StandardCharsets.UTF_8), Settings.class);
            }
        } catch (IOException e) {
            ArtNetDirector.logger.error(localizer.getLocalizedText(Texts.SETTINGS_READ_ERROR), e);
        }
    }
}
