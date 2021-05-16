export var I18n = require("i18n-js");
var $ = require("jquery");
var Translations = require("../lib/translations.js");

function setupI18n() {
    I18n.reset();
    I18n.translations = Translations();
    I18n.defaultLocale = "en";
    I18n.fallbacks = true;
    I18n.locale = navigator.language.split('-')[0];

    $("[i18n-key]").each((i: number, element: HTMLElement) => {
        var $element = $(element);

        if ($element.is("input:button")) {
            $element.val(
                I18n.t($element.attr("i18n-key") as string)
            );
        } else {
            $element.text(
                I18n.t($element.attr("i18n-key") as string)
            );
        }
    });

    $("[i18n-placeholder]").each((i: number, element: HTMLElement) => {
        var $element = $(element);
        $element.attr("placeholder",
            I18n.t($element.attr("i18n-placeholder") as string)
        );
    });
}
setupI18n();

function setupEnter() {
    document.addEventListener('keyup', (e) => {
        if (e.code === "Enter") {
            var $target = traverse(document.activeElement, "#" + $(document.activeElement).attr("enterId"));
            if ($target !== undefined)
                if ($target.is(":button")) {
                    $target.click();
                } else {
                    $target.focus();
                }
        }
    });
}
setupEnter();

export function popupHtml(innerHtml: string, onClose?: Function): void {
    closePopup();
    $("body").prepend("<div class=\"popup-wall\"><\/div><div class=\"popup\">\t<div class=\"popup-x\">\u2716\uFE0F<\/div><\/div>")
    $(".popup").append(innerHtml);
    $(".popup-x").on("click", function() {
        closePopup();
        if (onClose !== undefined) {
            onClose();
        }
    });
}

export function popup(title: string, text: string, onClose?: Function): void {
    closePopup();
    $("body").prepend("<div class=\"popup-wall\"><\/div><div class=\"popup\">\t<div class=\"popup-x\">\u2716\uFE0F<\/div><\/div>")
    $(".popup").append("<h2 class=\"center-text\">" + title + "<\/h2><p>" + text + "</p>");
    $(".popup-x").on("click", function() {
        closePopup();
        if (onClose !== undefined) {
            onClose();
        }
    });
}

export function closePopup() {
    $(".popup-wall, .popup").remove();
}

//traverses the dom element outward from the current element
function traverse(startElement: Element, query: string) {
    var $target: any = undefined;
    var $element = $(startElement);

    for (let i = 0; i < $element.parents().length; i++) {
      var $parent = $($element.parents()[i]);
      $target = $parent.find(query);
      if ($target.length > 0) return $target;
    }

    return $target;
}
