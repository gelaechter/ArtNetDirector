package io.github.gelaechter.data;

import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
public class Settings {
    private final Set<String> ipBlacklist = new HashSet<>();
    private String password = "ArtNetDirector";
    private int webPort = 7000;
    private int artNetPort = 6454;
}
