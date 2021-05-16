package io.github.gelaechter.util;

import javafx.application.Platform;
import javafx.scene.control.TextArea;
import org.jetbrains.annotations.NotNull;

import java.io.OutputStream;
import java.io.PrintStream;
import java.util.Arrays;

public class UIPrintStream extends PrintStream {
    private final TextArea textArea;

    public UIPrintStream(OutputStream main, TextArea textArea) {
        super(main);
        this.textArea = textArea;
    }

    @Override
    public void write(int b) {
        super.write(b);
        String msg = String.valueOf((char) b);
        Platform.runLater(() -> textArea.appendText(msg));
    }

    @Override
    public void write(@NotNull byte[] buf, int off, int len) {
        super.write(buf, off, len);
        String msg = new String(Arrays.copyOf(buf, len));
        Platform.runLater(() -> {
            textArea.appendText(msg);
            textArea.setScrollTop(Double.MAX_VALUE);
        });
    }
}