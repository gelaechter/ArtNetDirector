package io.github.gelaechter;

import ch.bildspur.artnet.ArtNetClient;
import ch.bildspur.artnet.PortDescriptor;
import ch.bildspur.artnet.events.ArtNetServerEventAdapter;
import ch.bildspur.artnet.packets.ArtNetPacket;
import ch.bildspur.artnet.packets.ArtPollReplyPacket;
import io.github.gelaechter.data.Node;
import io.github.gelaechter.data.User;
import io.github.gelaechter.util.Localizer;
import io.github.gelaechter.util.Texts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetAddress;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ArtNetServer {

    private final ArtNetDirector artNETDirector;
    private final ArtNetClient artnet = new ArtNetClient();

    private final Logger logger = LoggerFactory.getLogger(ArtNetServer.class);
    private final Localizer localizer = ArtNetDirector.getLocalizer();

    public ArtNetServer(ArtNetDirector artNETDirector) {
        this.artNETDirector = artNETDirector;
    }

    //starts the Art-Net server to process DMX packets
    public void start() {
        //pass received packets to the processPacket method
        artnet.getArtNetServer().addListener(new ArtNetServerEventAdapter() {
            @Override
            public void artNetPacketReceived(ArtNetPacket packet) {
                processPacket(packet);
            }
        });

        //Runs the Art-Net Server on the local address
        try {
            InetAddress address = ArtNetDirector.getMachineAddress();
            artnet.start(address);

            //Create the default poll reply packet
            ArtPollReplyPacket packet = createDefaultReply(address);
            artnet.getArtNetServer().setDefaultReplyPacket(packet);
        } catch (SocketException | UnknownHostException e) {
            logger.error(localizer.getLocalizedText(Texts.HOSTADDRESS_ERROR_ARTNET), e);
        }

    }

    private void processPacket(ArtNetPacket packet) {
        //This removes the / before the ip and the port after it, leaving only the ip.
        String packetIp = packet.getAddress().toString();
        packetIp = packetIp.substring(1, packetIp.lastIndexOf(":"));

        if (packetIp.equals("0:0:0:0:0:0:0:1"))
            packetIp = "127.0.0.1";

        try {
            if (packetIp.equals(InetAddress.getLocalHost().getHostAddress()))
                packetIp = "127.0.0.1";
        } catch (UnknownHostException e) {
            e.printStackTrace();
        }

        //We find the user who sent that packet
        if (!ArtNetDirector.userMap.containsKey(packetIp)) return;
        User user = ArtNetDirector.userMap.get(packetIp);

        //Nodes which will receive a packet
        List<Node> receivingNodes = new ArrayList<>();

        //Check if userIp is null for some reason and see if they are connected
        if (user.getIp() == null) return;
        if (!user.isConnected()) return;

        //If so we check which nodes they toggled and send the exact same packet to those nodes
        for (Node node : getToggledNodes(user)) {

            setPacketUniverse(packet, node.getUniverse());

            try {
                InetAddress address = InetAddress.getByName(node.getIp());
                artnet.getArtNetServer().unicastPacket(packet, address);

                //If the packet is an input add it to later indicate this transmission
                receivingNodes.add(node);
            } catch (UnknownHostException e) {
                logger.error(localizer.getLocalizedText(Texts.NODE_IP_RESOLVE_ERROR), node.getName(), node.getIp(), e);
            }
        }

        //Pass nodes who received packets to the director so that it can be indicated
        if (!receivingNodes.isEmpty())
            artNETDirector.indicateTransmission(user, receivingNodes);
    }

    public void setPacketUniverse(ArtNetPacket packet, int universe) {
        byte[] packetData = packet.getData();
        int net = universe % 16;
        int subUni = universe / 16;
        String netBits = String.format("%4s", Integer.toBinaryString(net)).replace(" ", "0");
        String subUniBits = String.format("%4s", Integer.toBinaryString(subUni)).replace(" ", "0");
        byte newUniverseByte = Byte.parseByte(subUniBits + netBits, 2);
        packetData[14] = newUniverseByte;
        packet.setData(packetData);
    }

    public List<Node> getToggledNodes(User user) {
        List<Node> nodes = new ArrayList<>();
        for (Map.Entry<Integer, Node> nodeEntry : ArtNetDirector.nodes.entrySet()) {
            if (user.isToggled(nodeEntry.getKey()))
                nodes.add(nodeEntry.getValue());
        }
        return nodes;
    }

    private ArtPollReplyPacket createDefaultReply(InetAddress address) {
        ArtPollReplyPacket reply = new ArtPollReplyPacket();

        // set fields
        reply.setIp(address);
        reply.setVersionInfo(1);
        reply.setSubSwitch(1);
        reply.setOemCode(5);
        reply.setPorts(new PortDescriptor[]{
                new PortDescriptor(),
                new PortDescriptor(),
                new PortDescriptor(),
                new PortDescriptor()
        });
        reply.setShortName("ArtNetDirector");
        reply.setLongName("ArtNetDirector Art-Net Server");
        reply.translateData();

        return reply;
    }

    public void stop() {
        if (artnet.isRunning())
            artnet.stop();
    }
}
