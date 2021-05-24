/// <reference path="../lib/sockette.d.ts" />
// import whatever we need
var utils = require("../lib/utils.ts");
var $ = require("jquery");
import Sockette from "sockette";

// prevent everthing from being global
export { };

// put functions in window scope, so html can access them:
(window as any).send = send;
(window as any).loadFromFile = loadFromFile;
(window as any).currentSlide = currentSlide;
(window as any).addNode = addNode;
(window as any).setPassword = setPassword;
(window as any).updatePorts = updatePorts;
(window as any).banUser = banUser;
(window as any).kickUser = kickUser;
(window as any).removeNode = removeNode;
(window as any).setLogNotification = setLogNotification;
(window as any).toggleEdit = editUsername;
(window as any).editNode = editNode;
(window as any).unBanUser = unBanUser;
(window as any).openHelp = openHelp;


const ws = new Sockette("ws://" + location.hostname + ":" + location.port + "/administrators", {
    timeout: 200,
    maxAttempts: 10,
    onopen: (event: Event) => console.log('Connected!', event),
    onmessage: (event: MessageEvent) => processJson(event),
    onreconnect: (event: Event | CloseEvent) => console.log('WS Reconnecting...', event),
    onmaximum: (event: CloseEvent) => {
        console.log('WS maximum reached', event)
        utils.popup(utils.I18n.t("no_connection"), utils.I18n.t("no_connection_message"))
    },
    onclose: (event: CloseEvent) => {
        console.log('WS Closed!', event)
        if (event.wasClean || event.reason.includes("Idle timeout expired")) {
            ws.reconnect();
        } else {
            utils.popup(utils.I18n.t("no_connection"), utils.I18n.t("no_connection_message"))
        }
    },
    onerror: (event: Event) => {
        console.error("WS Error:", event)
        utils.popup(utils.I18n.t("websocket_error"), event);
    }
});

//encode string to base64
function send(message: string) {
    if (message !== "") {
        ws.send(message);
    }
}

function processJson(message: MessageEvent) {

    // do not parse json if there is no json
    let data = JSON.parse(message.data);

    if (data[0] === "LOG") { $(".log").val(data[1]); setLogNotification(true); return; }
    if (data[0] === "SERVERSTOP") { utils.popup(utils.I18n.t("server_shutdown"), ""); return; }
    if (data[0] === "FILE") { download(data[1]); return; }
    if (data[0] === "AUTHORIZED") { utils.closePopup(); return; }
    if (data[0] === "AUTHORIZE") {
        //calls login popup
        utils.popupHtml("<h2 class=\"center-text\">" + utils.I18n.t("admin.popup.input_admin_password") + "<\/h2><input type=\"password\" class=\"input\" id=\"loginInput\" placeholder=\"" + utils.I18n.t("password") + "\" enterId=\"loginButton\"><button id=\"loginButton\" onclick=\"send(JSON.stringify(['AUTHORIZATION', document.getElementById('loginInput').value]))\" type=\"button\" class=\"input addButton\">" + utils.I18n.t("admin.popup.login") + "<\/button>", function() {
            window.location.replace("http://" + location.hostname + ":" + location.port);
        });
        return;
    }
    if (data[0] === "WRONGPASSWORD") {
        utils.popup(utils.I18n.t("admin.popup.wrong_password"), utils.I18n.t("admin.popup.wrong_password_message"), function() {
            location.reload();
        });
        return;
    }
    if (data[0] === "PASSWORDCHANGED") {
        utils.popup(utils.I18n.t("admin.popup.password_changed"), utils.I18n.t("admin.popup.password_changed_message"), function() {
            location.reload();
        });
        return;
    }
    if (data[0] === "TRANSMITTING") return;

    $(".nodeTable tbody").empty();
    var nodes = data["nodes"];
    displayNodes(nodes);

    $(".bannedUserTable tbody").empty();
    var bannedUsers = data["settings"]["ipBlacklist"];
    displayBannedUsers(bannedUsers);

    $(".userTable tbody").empty();
    var userMap = data["userMap"];
    displayUsers(userMap, nodes, bannedUsers);

}

function displayUsers(userMap: any, nodes: any, ipBlacklist: string[]) {
    for (const context in userMap) {
        var user = userMap[context];
        var connected = user["connected"];
        var userName = user["userName"];
        var ip = user["ip"];
        var toggledNodes = user["toggled"];

        //don't display banned users
        if(ipBlacklist.includes(ip)) continue;

        //Write every active node into cell
        var i = 0;
        for (const number in toggledNodes) {
            toggledNodes[i] = nodes[number]["name"];
            i++;
        }


        //make disconnected users slightly transparent
        var opacity = connected ? 1.0 : 0.5;

        var tableRow: string =
        "<tr style=\"opacity: " + opacity + "\">" +
        "<td>" +
        "<p class=\"single-line\" style=\"display: inline;\" enterid=\"usernameEditButton\" contenteditable=\"false\">" + userName + "</p>" +
        "<button id=\"usernameEditButton\" onclick=\"toggleEdit(this);\" class=\"edit-button\">✏️</button></td>" +
        "<td>" + ip + "</td>" +
        "<td>" + toggledNodes + "</td>" +
        "<td><button onclick=\"kickUser('" + ip + "')\" class=\"removeButton\">" + utils.I18n.t("admin.users.remove_user") + "</button></td>" +
        "<td><button onclick=\"banUser('" + ip + "')\" class=\"removeButton\">" + utils.I18n.t("admin.users.ban_user") + "</button></td>" +
        "</tr>"

        //put connected users to the top and disconnected users to the bottom
        if (connected){
          $(".userTable tbody").prepend(tableRow);
        } else{
          $(".userTable tbody").append(tableRow);
        }
    }
}

function editUsername(button: HTMLElement) {
    var $button = $(button);
    var $text = $button.siblings("p");
    var editing: string = $text.attr("contenteditable");
    var userIp = $text.parent().parent().children("td:eq(1)").text();

    if (editing === "false") {
        //start editing
        $button.text("✔️");
        $text.attr("contenteditable", "true");
        $text.focus();
        window.getSelection()
            .selectAllChildren(
                $text.get(0)
            );

    } else {

        //stop editing
        changeUsersName(
            userIp,
            $text.text()
        );

        $button.text("✏️");
        $text.attr("contenteditable", "false");
    }
}

function editNode(button: HTMLElement, nodeNumber: number) {
    var $button = $(button);
    var $textFields = $button.parent().parent().find("p");

    var $nameField = $textFields.eq(0);
    var $ipField = $textFields.eq(1);
    var $universeField = $textFields.eq(2);


    var editing: string = $nameField.attr("contenteditable");

    if (editing === "false") {
        //start editing
        $button.text("✔️");

        $nameField.attr("contenteditable", "true");
        $ipField.attr("contenteditable", "true");
        $universeField.attr("contenteditable", "true");

    } else {

        var nodeName: string = $nameField.text();
        var nodeIp: string = $ipField.text();
        var nodeUniverse = $universeField.text();


        //Validate all the fields, just copied from the previous thing because im lazy
        if (nodeName === undefined || nodeName === "") nodeName = utils.I18n.t("admin.nodes.unnamed_node");
        if (isNaN(nodeUniverse) || nodeUniverse < 0 || nodeUniverse > 255) nodeUniverse = "0";
        if (nodeIp === undefined) nodeIp = "";



        //Regular expression from here https://riptutorial.com/regex/example/14146/match-an-ip-address
        var ipPattern = new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}::[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}::$/gm);
        if (!ipPattern.test(nodeIp)) {
            utils.popup(utils.I18n.t("admin.popup.invalid_ip_address"), "");
            return;
        }

        $button.text("✏️");

        $nameField.attr("contenteditable", "false");
        $ipField.attr("contenteditable", "false");
        $universeField.attr("contenteditable", "false");

        removeNode(nodeNumber);
        send(JSON.stringify(["ADDNODE", nodeName, nodeIp, nodeUniverse]));
    }
}

function displayBannedUsers(ipBlacklist: string[]) {
    for (const index in ipBlacklist) {
        $(".bannedUserTable tbody").append(
            "<tr>" +
            "<td>" + ipBlacklist[index] + "</td>" +
            "<td><button onclick=\"unBanUser('" + ipBlacklist[index] + "')\" class=\"removeButton\">" + utils.I18n.t("admin.users.unban_user") + "</button></td>" +
            "</tr>"
        );
    }
}

function displayNodes(nodes: any) {
    for (const number in nodes) {
        var node = nodes[number];
        var nodeName = node["name"];
        var nodeIp = node["ip"];
        var nodeUniverse = node["universe"];

        $(".nodeTable tbody").append(
            "<tr>" +
            "<td>" +
            "<p class=\"single-line\" style=\"display: inline;\" enterid=\"nodeEditButton\" contenteditable=\"false\">" + nodeName + "</p>" +
            "</td>" +
            "<td>" +
            "<p class=\"single-line\" style=\"display: inline;\" enterid=\"nodeEditButton\" contenteditable=\"false\">" + nodeIp + "</p>" +
            "</td>" +
            "<td>" +
            "<p class=\"single-line\" style=\"display: inline;\" enterid=\"nodeEditButton\" contenteditable=\"false\">" + nodeUniverse + "</p>" +
            "</td>" +
            "<td><button id=\"nodeEditButton\" onclick=\"editNode(this, " + number + ");\" class=\"edit-button\">✏️</button></td>" +
            "<td><button onclick=\"removeNode(" + number + ")\" class=\"removeButton\">" + utils.I18n.t("admin.nodes.remove_node") + "</button></td>" +
            "</tr>"
        );
    }
}

function kickUser(ip: string) {
    if (ip != null) {
        send(JSON.stringify(["KICKUSER", ip]));
    }
}

function banUser(ip: string) {
    if (ip != null) {
        send(JSON.stringify(["BANUSER", ip]));
    }
}

function unBanUser(ip: string) {
    if (ip != null) {
        send(JSON.stringify(["UNBANUSER", ip]));
    }
}

function changeUsersName(ip: string, username: string) {
    if (ip != null) {
        send(JSON.stringify(["CHANGEUSERNAME", ip, username]));
    }
}

function removeNode(number: number) {
    if (number != null) {
        send(JSON.stringify(["REMOVENODE", number]));
    }
}



function addNode() {
    var nodeName: string = $("#nodeNameField").val();
    var nodeIp: string = $("#nodeIpField").val();
    var nodeUniverse = $("#nodeUniverseField").val();

    if (nodeName === undefined || nodeName === "") nodeName = utils.I18n.t("admin.nodes.unnamed_node");
    if (isNaN(nodeUniverse) || nodeUniverse < 0 || nodeUniverse > 255) nodeUniverse = "0";
    if (nodeIp === undefined) nodeIp = "";

    //Regular expression from here https://riptutorial.com/regex/example/14146/match-an-ip-address
    var ipPattern = new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}::[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}::$/gm);
    if (!ipPattern.test(nodeIp)) {
        utils.popup("", utils.I18n.t("admin.popup.invalid_ip_address"));
        return;
    }

    $("#nodeNameField").val("");
    $("#nodeIpField").val("");
    $("#nodeUniverseField").val("");
    send(JSON.stringify(["ADDNODE", nodeName, nodeIp, nodeUniverse]));
}

// Function to download data to a file
function download(data: string) {
    var filename = "ArtNetDirector.atd"
    var file = new Blob([data], { type: "application/atd;charset=utf-8" });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function loadFromFile() {
    //auto submit after selection
    $("#fileInput").change(function() {
        var fileReader = new FileReader();
        fileReader.onload = function() {
            var data = fileReader.result;  // data <-- in this var you have the file data in Base64 format
            send(JSON.stringify(["LOAD", data]));
        };
        fileReader.readAsText($('#fileInput').prop('files')[0]);
    });

    //trigger file select
    $("#fileInput").click();
}

function setPassword() {
    if ($("#password").val() === $("#repeatPassword").val()) {
        send(JSON.stringify(["CHANGEPASSWORD", $("#password").val()]));
        $("#password").val("");
        $("#repeatPassword").val("");
    } else {
        utils.popup(utils.I18n.t("admin.popup.password_discrepancy"), utils.I18n.t("admin.popup.password_discrepancy_message"));
    }
}

function updatePorts() {
    //set ports to default if values are not numeric
    if (isNaN(Number($("#webPort").val()))) $("#webPort").val(7000);

    //send changed ports
    send(JSON.stringify([
        "UPDATEPORTS",
        $("#webPort").val()
    ]))
}

function setLogNotification(showing: boolean) {
    if (showing) {
        if ($("#logSpan").children("sup").length === 0 && !$("#logSpan").closest("li").hasClass("active"))
            $("#logSpan").append('<sup>&#128308;</sup>');
    } else {
        $("#logSpan").children("sup").remove();
    }
}

function openHelp() {
  var url =  utils.I18n.t("admin.help_url");
  window.open(url, '_blank');
}

//Slide stuff
var slideIndex: number = 1;
showSlides(slideIndex);

//sets the slideIndex to n and shows that slide
function currentSlide(n: number) {
    slideIndex = n
    showSlides(slideIndex);
}

//the logic to switch between slides (basically hides all slides that are not shown)
function showSlides(n: number) {
    var $slides = $(".slide");
    if ($slides.length === 0) return;
    if (n > $slides.length) {
        slideIndex = 1;
    }
    if (n < 1) {
        slideIndex = $slides.length;
    }
    $slides.hide();

    $(".tab").removeClass("active");
    $slides.eq(slideIndex - 1).show();
    $(".tab:eq(" + (slideIndex - 1) + ")").addClass("active");
}
