package io.github.gelaechter.data;

import lombok.Data;

@Data
public class Node {
    private final String name;
    private final String ip;
    private int universe = 0;
}
