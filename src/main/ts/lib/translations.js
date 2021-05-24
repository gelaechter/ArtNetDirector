;
(function () {
    var generator = function () {
        var Translations = {};

        Translations["en"] = {
            user: {
              no_available_nodes: "There currently are no available nodes.",
              transmitting_to_node: "Transmitting to node?",
              toggle_transmit: "Toggle transmit",
              transmission_takeover: "Exclusive transmission",
              transmitting: "\uD83D\uDCE1 Transmitting",
              transmit_true: "\u2705 Packets will be transmitted",
              transmit_false: "\u274C Packets will not be transmitted",
              help_url: "https://github.com/gelaechter/ArtNetDirector/wiki/User-interface"
            },

            admin: {
              tabs: {
                file: "\uD83D\uDCC1 File",
                users: "\uD83D\uDCBB Users",
                nodes: "\uD83D\uDCA1 Nodes",
                log: "\uD83D\uDCC3 Log",
                settings: "\u2699\uFE0F Settings"
              },

              users: {
                users: "Users",
                transmitting_to_nodes: "Transmitting to nodes",
                remove: "Disconnect",
                ban: "Ban",
                remove_user: "Disconnect user",
                ban_user: "Ban user",
                unban_user: "Unban users"
              },

              file: {
                save: "Save",
                load: "Open"
              },

              nodes: {
                nodes: "Nodes",
                name: "Name",
                universe: "Universe",
                remove: "Remove",
                remove_node: "Remove node",
                unnamed_node: "Unnamed node",
                create: "Create",
                edit: "Edit node"
              },

              log: "Log",

              settings: {
                settings: "Settings",
                banned_users: "\uD83D\uDEAB Banned users",
                unban: "Unban",
                change_admin_password: "\uD83D\uDD11 Change admin password",
                repeat_password: "Repeat password",
                set_new_password: "Set new password",
                port_settings: "\uD83D\uDD0C Port Settings",
                change_ports_and_restart: "Change ports & restart"
              },

              popup: {
                input_admin_password: "\uD83D\uDD11 Input admin password",
                login: "Login",
                wrong_password: "\u274C Wrong password",
                wrong_password_message: "The entered password is wrong.\nYou can find the password in the console.",
                password_changed: "\u2139️ The admin password was changed",
                password_changed_message: "The new password is in the console.",
                password_discrepancy: "\u2757️ The passwords do not match",
                password_discrepancy_message: "The passwords entered do not match.\nThe password has not been changed.",
                invalid_ip_address: "\u2757️ This IP address is invalid"
              },

              help_url: "https://github.com/gelaechter/ArtNetDirector/wiki/Admin-interface"
            },

            fallback: {
              you_have_been_removed: "You have been disconnected by an administrator!",
              you_have_been_banned: "You have been banned by an administrator!",
              return_to_main_page: "Return to main page"

            },

            password: "Password",
            server_shutdown: "The server was shut down",
            username: "Username",
            ip_address: "IP address",
            no_connection: "Connection lost",
            no_connection_message: "Connection to the host server was lost.\nRefresh the site to try to reconnect.",
            websocket_error: "A connection error occured",
            help: "Help"
        };

        Translations["de"] = {
          user: {
            no_available_nodes: "Es sind momentan keine Knoten verfügbar.",
            transmitting_to_node: "Übertragung zum Knoten?",
            toggle_transmit: "Übertragung umschalten",
            transmission_takeover: "Alleinige Übernahme",
            transmitting: "\uD83D\uDCE1 Sendet",
            transmit_true: "\u2705 Pakete werden übertragen",
            transmit_false: "\u274C Pakete werden nicht übertragen",
            help_url: "https://github.com/gelaechter/ArtNetDirector/wiki/De:User-interface"
          },

          admin: {
            tabs: {
              file: "\uD83D\uDCC1 Datei",
              users: "\uD83D\uDCBB Benutzer",
              nodes: "\uD83D\uDCA1 Knoten",
              log: "\uD83D\uDCC3 Log",
              settings: "\u2699\uFE0F Einstellungen"
            },

            users: {
              users: "Benutzer",
              transmitting_to_nodes: "Überträgt auf Knoten",
              remove: "Trennen",
              ban: "Sperren",
              remove_user: "Nutzer trennen",
              ban_user: "Nutzer sperren",
              unban_user: "Nutzer entsperren",
              help_url: "https://github.com/gelaechter/ArtNetDirector/wiki/De:Home",
            },

            file: {
              save: "Speichern",
              load: "Öffnen"
            },

            nodes: {
              nodes: "Knoten",
              name: "Name",
              universe: "Universum",
              remove: "Entfernen",
              remove_node: "Knoten entfernen",
              unnamed_node: "Unbenannter Knoten",
              create: "Erstellen",
              edit: "Knoten bearbeiten"
            },

            log: "Log",

            settings: {
              settings: "Einstellungen",
              banned_users: "\uD83D\uDEAB Gesperrte Benutzer",
              unban: "Entsperren",
              change_admin_password: "\uD83D\uDD11 Admin-Passwort ändern",
              repeat_password: "Passwort wiederholen",
              set_new_password: "Neues Passwort festlegen",
              port_settings: "\uD83D\uDD0C Port Einstellungen",
              change_ports_and_restart: "Ports ändern & neu starten"
            },

            popup: {
              input_admin_password: "\uD83D\uDD11 Admin-Passwort eingeben",
              login: "Login",
              wrong_password: "\u274C Falsches Passwort",
              wrong_password_message: "Das eingegebene Passwort ist falsch.\nDu kannst das Passwort in der Konsole finden.",
              password_changed: "\u2139️ Das Admin-Passwort wurde geändert",
              password_changed_message: "Das neue Passwort steht in der Konsole.",
              password_discrepancy: "\u2757️ Die Passwörter stimmen nicht überein",
              password_discrepancy_message: "Die eingegebenen Passwörter stimmen nicht überein.\nDas Passwort wurde nicht geändert.",
              invalid_ip_address: "\u2757️ Diese IP-Adresse ist ungültig"
            },

            help_url: "https://github.com/gelaechter/ArtNetDirector/wiki/De:Admin-interface"
          },

          fallback: {
            you_have_been_removed: "Ein Administrator hat deine Verbindung getrennt!",
            you_have_been_banned: "Du wurdest von einem Administrator gesperrt!",
            return_to_main_page: "Zurück zur Hauptseite"
          },

          password: "Passwort",
          server_shutdown: "Der Server wurde heruntergefahren",
          username: "Benutzername",
          ip_address: "IP-Adresse",
          no_connection: "Verbindung verloren",
          no_connection_message: "Die Verbindung zum Server wurde verloren.\nAktualisiere die Seite um eine neue Verbindung aufzubauen.",
          websocket_error: "Ein Verbindungsfehler ist aufgetreten",
          help: "Hilfe"
        };

        return Translations;
    };

    if (typeof define === 'function' && define.amd) {
        define(function () {
            return generator;
        });
    } else if (typeof (exports) === "undefined") {
        window.Translations = generator;
    } else {
        module.exports = generator;
    }
})();
