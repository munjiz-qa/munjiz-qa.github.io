import QtQuick 2.0;
import calamares.slideshow 1.0;
Presentation {
    id: presentation
    function nextSlide() { presentation.goToNextSlide(); }
    Timer { interval: 6000; running: presentation.activatedInCalamares; repeat: true; onTriggered: nextSlide() }
    Slide {
        Rectangle { anchors.fill: parent; color: "#0B1E2D" }
        Image { source: "logo.png"; width: 160; height: 160; fillMode: Image.PreserveAspectFit; anchors.centerIn: parent; anchors.verticalCenterOffset: -60 }
        Text { anchors.horizontalCenter: parent.horizontalCenter; y: parent.height/2 + 50; text: "جارٍ تثبيت الرازي… علمٌ يُحيي كل جهاز"; color: "#F7F3E8"; font.pixelSize: 22 }
    }
    Slide {
        Rectangle { anchors.fill: parent; color: "#0B1E2D" }
        Text { anchors.centerIn: parent; width: parent.width*0.8; wrapMode: Text.WordWrap; horizontalAlignment: Text.AlignHCenter
               text: "كل ما تحتاجه جاهز: مكتب عربي، متصفح، بريد، وسائط، تعليم، وبرمجة."; color: "#F3CF72"; font.pixelSize: 22 }
    }
    function onActivate() { presentation.currentSlide = 0; }
    function onLeave() { }
}
