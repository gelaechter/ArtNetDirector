package io.github.gelaechter.util;

import lombok.Getter;
import lombok.Setter;
import org.apache.commons.lang3.exception.ExceptionUtils;

import java.util.Locale;
import java.util.ResourceBundle;

public class Localizer {
    private static final String RESOURCE_BUNDLE = "localization";
    @Getter @Setter
    private Locale locale;

    public Localizer() {
        this(Locale.getDefault());
    }

    public Localizer(Locale locale) {
        this.locale = locale;
    }

    public String getLocalizedText(Enum<Texts> text) {
        String key = text.toString();
        try {
            ResourceBundle bundle = ResourceBundle.getBundle(RESOURCE_BUNDLE,
                    locale, this.getClass().getClassLoader());

            if (bundle.keySet().contains(key)) {
                return bundle.getString(key);
            } else {
                return key + "(No localization entry found)";
            }
        } catch (Exception e) {
            return "LOCALIZATION FAILED FOR KEY \"" + key + "\":" + ExceptionUtils.getStackTrace(e);
        }
    }
}

