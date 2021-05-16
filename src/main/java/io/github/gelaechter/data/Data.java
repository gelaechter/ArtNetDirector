package io.github.gelaechter.data;

import java.util.Map;

//This class models the data sent to the clients
@lombok.Data
public class Data {
	private final Map<String, User> userMap;
	private final Map<Integer, Node> nodes;
	private final Settings settings;
}
