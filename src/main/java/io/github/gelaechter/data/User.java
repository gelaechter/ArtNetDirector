package io.github.gelaechter.data;

import io.github.gelaechter.ArtNetDirector;
import io.github.gelaechter.util.Texts;
import lombok.Data;

import java.util.HashSet;

@Data
public class User {
    private String userName = ArtNetDirector.getLocalizer().getLocalizedText(Texts.UNNAMED_USER);
    private final String ip;
    private boolean connected = true;
    private final HashSet<Integer> toggled = new HashSet<>();

    public User(String ip) {
        this.ip = ip;
    }

    public boolean isToggled(int number) {
        return toggled.contains(number);
    }

    public void setToggled(int number, boolean toggled) {
        if (toggled) {
            this.toggled.add(number);
        } else {
            this.toggled.remove(number);
        }
    }
}