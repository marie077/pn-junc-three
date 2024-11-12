totalScenes = 1;
sceneCount = 0;
let scenes = []

StartScroll = () => {
  let controller = new ScrollMagic.Controller();

  let scene_1 = new ScrollMagic.Scene({
      triggerElement: '#scene_1'
    })
    .setClassToggle('#scene_1', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 0) {
        sceneCount = 1;
      } else {
        sceneCount = 0;
      }
    })
    .addTo(controller);

  let scene_2 = new ScrollMagic.Scene({
      triggerElement: '#scene_2'
    })
    .setClassToggle('#scene_2', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 1) {
        electron.moveToPos(width / 2 + 200, height / 2);
        sceneCount = 2;
      } else {
        sceneCount = 1;
      }
    })
    .addTo(controller);

  let scene_3 = new ScrollMagic.Scene({
      triggerElement: '#scene_3'
    })
    .setClassToggle('#scene_3', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 2) {
        sceneCount = 3;
      } else {
        sceneCount = 2;
      }
    })
    .addTo(controller);

  let scene_4 = new ScrollMagic.Scene({
      triggerElement: '#scene_4'
    })
    .setClassToggle('#scene_4', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 3) {
        sceneCount = 4;
      } else {
        sceneCount = 3;
      }
    })
    .addTo(controller);

  let scene_5 = new ScrollMagic.Scene({
      triggerElement: '#scene_5'
    })
    .setClassToggle('#scene_5', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 4) {
        sceneCount = 5;
        d3load();
      } else {
        sceneCount = 4;
        d = 50;
      }
    })
    .addTo(controller);

  let showGraph = new ScrollMagic.Scene({
      triggerElement: '#d3-viz'
    })
    .setClassToggle('#d3-viz', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    // .on('start', () => {
    //   if (sceneCount == 4) {
    //     sceneCount = 5;
    //     d3load();
    //   } else {
    //     sceneCount = 4;
    //     d = 50;
    //   }
    // })
    .addTo(controller);

  let scene_6 = new ScrollMagic.Scene({
      triggerElement: '#scene_6'
    })
    .setClassToggle('#scene_6', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 5) {
        sceneCount = 6;
        d = 50;
        mainGraph1s();
      } else {
        sceneCount = 5;
        d = 50;
        d3load();
      }
    })
    .addTo(controller);

  let scene_7 = new ScrollMagic.Scene({
      triggerElement: '#scene_7'
    })
    .setClassToggle('#scene_7', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 6) {
        sceneCount = 7;
        mainGraph2s();
        d = 50;
      } else {
        sceneCount = 6;
      }
    })
    .addTo(controller);

  let scene_8 = new ScrollMagic.Scene({
      triggerElement: '#scene_8'
    })
    .setClassToggle('#scene_8', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 7) {
        sceneCount = 8;
        mainGraph2p();
        d = 50;
      } else {
        sceneCount = 7;
      }
    })
    .addTo(controller);

  let scene_9 = new ScrollMagic.Scene({
      triggerElement: '#scene_9'
    })
    .setClassToggle('#scene_9', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 8) {
        sceneCount = 9;
        change_2p_label(sceneCount);
        d = 50;
      } else {
        sceneCount = 8;
        change_2p_label(sceneCount);
      }
    })
    .addTo(controller);

  let scene_10 = new ScrollMagic.Scene({
      triggerElement: '#scene_10'
    })
    .setClassToggle('#scene_10', 'fade-in')
    // .addIndicators({
    //   name: 'fade scene',
    //   colorTrigger: 'white',
    //   colorStart: '#FFF7AE'
    // })
    .on('start', () => {
      if (sceneCount == 9) {
        sceneCount = 10;
      } else {
        sceneCount = 9;
      }
    })
    .addTo(controller);

}