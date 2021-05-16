package io.github.gelaechter;

/**
 * Since the Java launcher checks if the main class extends javafx.application.Application, and
 * in that case it requires the JavaFX runtime available as modules (not as jars), a possible workaround
 * to make it work, should be adding a new Main class that will be the main class of your project, and
 * that class will be the one that calls your JavaFX Application class.
 * https://stackoverflow.com/questions/52569724/javafx-11-create-a-jar-file-with-gradle/52571719#52571719
 */
public class Main {

    public static void main(String[] args) {
        ArtNetDirector.main(args);
    }

}
