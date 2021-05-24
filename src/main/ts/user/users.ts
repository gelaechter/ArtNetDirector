/// <reference path="../lib/sockette.d.ts" />
// import whatever we need
var utils = require("../lib/utils.ts");
var $ = require("jquery");
import Sockette from "sockette";

// prevent everthing from being global
export { };

// put functions in scope, so html can access them:
(window as any).plusSlides = plusSlides;
(window as any).toggleTransmit = toggleTransmit;
(window as any).currentSlide = currentSlide;
(window as any).setUserName = setUserName;
(window as any).transmissionTakeover = transmissionTakeover;
(window as any).openHelp = openHelp;

const ws = new Sockette("ws://" + location.hostname + ":" + location.port + "/users", {
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
let myIp: string;

//encode string to base64
function send(message: string) {
    if (message !== "") {
        ws.send(message);
    }
}

//gets called everytime a json is received and then processes it and updates the UI
function processJson(message: MessageEvent) {

    //All data received will be json
    let data = JSON.parse(message.data);
    console.log(data)

    if (data[0] === "KICKED") { window.location.href = "/kicked"; return; }
    if (data[0] === "BANNED") { window.location.href = "/banned"; return; }
    if (data[0] === "SERVERSTOP") { utils.popup(utils.I18n.t("server_shutdown"), ""); ws.close(); return; }
    if (data[0] === "CLIENTIP") { myIp = data[1]; return; }
    if (data[0] === "TRANSMITTING") { indicateTransmit(data); return; }


    var tableScrolling: any = $(".tableFixHead:visible").scrollTop();

    var nodes = data["nodes"];
    $("#container").html("");
    if ($.isEmptyObject(nodes)) $("#container").html("<h1 style=\"width: 100%; height: 100%; text-align: center;\">" + utils.I18n.t("user.no_available_nodes") + "</h1>");

    $(".sidebar").html("");
    updateNodes(nodes);

    if (!$.isEmptyObject(nodes)) {
        $("#container").append(
            "<a class=\"prev\" onclick=\"plusSlides(-1)\">&#10094;</a>\r\n" +
            "<a class=\"next\" onclick=\"plusSlides(1)\">&#10095;</a>");
    }

    var userMap = data["userMap"];
    updateUsers(userMap);

    $(".tableFixHead:visible").scrollTop(tableScrolling);

    showSlides(slideIndex);
}

//updates the node part of the UI
function updateNodes(nodes: any) {
    for (const nodeNumber in nodes) {
        var node = nodes[nodeNumber];
        var nodeName = node["name"];

        var html = "<div class=\"nodeSlide\">" +
            "<b class=\"title\">" + nodeName + "<\/b>" +
            "<div class=\"tableFixHead\">" +
            "<table style=\"table-layout: fixed;\">" +
            "<thead>" +
            "<tr><th>" + utils.I18n.t("username") + "<\/th><th>" + utils.I18n.t("user.transmitting_to_node") + "<\/th><\/tr>" +
            "<\/thead>" +
            "<tbody id=\"node" + nodeNumber + "table\">" +
            "<\/tbody>" +
            "<\/table>" +
            "<\/div>" +
            "<div class=\"footer\">" +
            "<input type=\"button\" style=\"margin: 6px\"class=\"button\" value=\"" + utils.I18n.t("user.toggle_transmit") + "\" onclick=\"toggleTransmit(" + nodeNumber + ")\"\/>" +
            "<input type=\"button\" style=\"margin: 6px\"class=\"button\" value=\"" + utils.I18n.t("user.transmission_takeover") + "\" onclick=\"transmissionTakeover(" + nodeNumber + ")\"\/>" +
            "<\/div>" +
            "<\/div>";

        var slideNum = parseInt(nodeNumber) + 1;
        var nodeEntryHTML = "<li id=\"node" + nodeNumber + "Entry\"class=\"nodeEntry\"><a onclick=\"currentSlide(" + slideNum + ")\"><span>" + nodeName + "</span></a>\r\n</li>";

        $("#container").append(html);
        $("#sidebar").append(nodeEntryHTML);
    }
}

//updates the users in the node tables
function updateUsers(userMap: any) {
    for (const userIp in userMap) {
        var user = userMap[userIp];
        var userName = user["userName"];
        var connected = user["connected"];

        if (connected === true) {
            var tables = $("table");
            for (let i = 0; i < tables.length; ++i) {
                var tableBody = tables[i].getElementsByTagName("tbody")[0];

                var row = tableBody.insertRow(-1);
                row.id = "user" + userIp + "row";
                var userNameCell = row.insertCell(0);
                var toggledCell = row.insertCell(1);

                $(userNameCell).html(userName);

                toggledCell.innerHTML = isNodeToggled(user, i) ? utils.I18n.t("user.transmit_true") : utils.I18n.t("user.transmit_false");
            }
        }
    }

    //updates the color of the sidebar entries for easy overview
    $(".nodeEntry").each(function(index: number, el: HTMLElement) {
        var element = $(el);
        if (isNodeToggled(userMap[myIp], index)) {
            element.find("span").css("color", "lime");
        } else {
            element.find("span").css("color", "red");
        }
    });
}

//sends the username or a placeholder to the server
function setUserName() {
    var userName = $("#nameInput").val();
    if (userName !== null && userName !== "") {
        send(JSON.stringify(["USERNAME", userName]));
    } else {
        send(JSON.stringify(["USERNAME", ""]));
    }
    $("#nameInput").val("");
}

//toggles the transmit for a specified node
function toggleTransmit(nodeNumber: number) {
    send(JSON.stringify(["TOGGLENODE", nodeNumber]));
}

function transmissionTakeover(nodeNumber: number) {
    send(JSON.stringify(["TRANSMISSIONTAKEOVER", nodeNumber]));
}

let sending = false;
let timeout: number;

function indicateTransmit(data: any) {
    var userIp = data[1];
    var nodeNumbers = data[2];

    let html = "<span style=\"float:right;\">" + utils.I18n.t("user.transmitting") + "<\/span>"

    clearTimeout(timeout);
    //iterate over the nodes to see the index on the website of our node number
    for (const nodeNumber of nodeNumbers) {
        //find the table body with the node number
        var $table = $("#node" + nodeNumber + "table");
        //find the cell by getting the first child of the row with the userIp
        const userNameCell = $table.children("[id=\'user" + userIp + "row\']").children().get(0);
        //if the html doesn't already contain the indicator add it
        if ($(userNameCell).children("span").length !== 0) {
            sending = true;
            $(userNameCell).children("span").remove();

        }
        $(userNameCell).append(html);
        timeout = window.setTimeout(function() { removeIndicator(userNameCell) }, 1000);
        //one second later remove it

    }
}

function removeIndicator(userNameCell: HTMLElement) {
    if (!sending) {
        $(userNameCell).children("span").remove();
    } else {
        sending = false;
        timeout = window.setTimeout(function() { removeIndicator(userNameCell) }, 1000);
    }
    console.log(sending);
}

//returns true if a node is toggled for a user
const isNodeToggled = function(user: any, number: number) {
    var toggledNodes = user["toggled"];
    return toggledNodes.includes(number);
};

function openHelp() {
    var url = utils.I18n.t("user.help_url");
    window.open(url, '_blank');
}

//Slide stuff
var slideIndex: number = 1;
showSlides(slideIndex);

//increases slideIndex by n positions and shows the slides (can be negative)
function plusSlides(n: number) {
    slideIndex += n;
    showSlides(slideIndex);
}

//sets the slideIndex to n and shows that slide
function currentSlide(n: number) {
    slideIndex = n
    showSlides(slideIndex);
}

//the logic to switch between slides (basically hides all slides that are not shown)
function showSlides(n: number) {
    var $slides = $(".nodeSlide");
    if ($slides.length === 0) return;
    if (n > $slides.length) {
        slideIndex = 1;
    }
    if (n < 1) {
        slideIndex = $slides.length;
    }
    $slides.hide();

    $(".nodeEntry").removeClass("active");
    $slides.eq(slideIndex - 1).show();
    $(".nodeEntry:eq(" + (slideIndex - 1) + ")").addClass("active");
}
