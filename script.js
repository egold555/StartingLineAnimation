window.onload = function () {

    $('begin')

    init();
}

function beginAnimation() {
    audio = document.getElementById('myAudio');

    audio.src = "Kito & Reija Lee - Starting Line.mp3";
    audio.mute = true;
    // not really needed in this exact case, but since it is really important in other cases,
    // don't forget to revoke the blobURI when you don't need it
    audio.onend = function (e) {
        URL.revokeObjectURL(this.src);
    }

    $('.upload-btn-wrapper').hide();
    loadStats();
    setupAudioAnalizer(audio);
    render(); //Start tunnel movement
}


function setupAudioAnalizer(audio) {
    var ctx = new AudioContext();



    var audioSrc = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();

    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;
    filter.connect(analyser);

    // we have to connect the MediaElementSource with the analyser 
    audioSrc.connect(analyser);
    audioSrc.connect(ctx.destination);

    // frequencyBinCount tells you how many values you'll receive from the analyser
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    audio.play();
}


var stats;

function loadStats() {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

var maxNum = 0;
var pulseLocked = false;

function detectAudioBeats() {

    analyser.getByteFrequencyData(frequencyData);
    twoD.clearRect(0, 0, canvas.width, canvas.height);
    var bars = frequencyData.length;
    for (var i = 0; i < bars; i++) {
        var bar_x = i * 3;
        var bar_width = 2;
        var bar_height = (frequencyData[i] / 2);

        twoD.fillStyle = '#00CCFF';

        /*if (bar_height > maxHeight) { //detect highest peaks?
            maxHeight = bar_height;
            twoD.fillStyle = '#FFCC00';
        }*/

        twoD.fillRect(bar_x, canvas.height, bar_width, -bar_height);
    }


    //Shitty beat detection averagigng beats
    var smoo = Smooth(frequencyData);

    var avgVolume = smoo(1) / frequencyData.length;

    //avgVolume = avgVolume + 0.7; //0.7

    twoD.font = "30px Arial";
    if (avgVolume > maxNum) {
        maxNum = avgVolume;
    }

    if (avgVolume >= 0.24) {
        if (!pulseLocked) {
            pulseLocked = true;
            setTimeout(function () {
                pulseLocked = false;
            }, 800);

            pulse();

        }
    }

    //twoD.fillStyle = '#FFCC00';
    //twoD.fillText(avgVolume, 50, 50);
    //twoD.fillText(maxNum, 50, 100);

    // mouse.x = avgVolume * 10000;
    terrain.material.uniforms.maxHeight.value = (avgVolume * 100) + 20;
}



function pulse() {

    var amount = Math.random();
    terrain.material.uniforms.hueEric.value = amount;
    console.log("Pulsed: " + amount);
    
    //when we pulse, we should do something cool wth the camera.
    //Should we add a space ship or something?

}

//LANDSCAPE

const container = document.getElementById("landscape")
var width = window.innerWidth;
var height = window.innerHeight;

var scene, renderer, camera;
var terrain;

var twoD, canvas;


const mouse = {
    x: 0,
    y: 0,
    xDamped: 0,
    yDamped: 0
};
const isMobile = typeof window.orientation !== 'undefined'



function init() {

    sceneSetup();
    sceneElements();
    sceneTextures();

    if (isMobile)
        window.addEventListener("touchmove", onInputMove, {
            passive: true
        })
    else
        window.addEventListener("mousemove", onInputMove, {
            passive: true
        })

    window.addEventListener("resize", resize)
    resize();

    canvas = document.getElementById('analyser_render');
    twoD = canvas.getContext('2d');
}

function sceneSetup() {
    scene = new THREE.Scene();
    var fogColor = new THREE.Color(0x333333)
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 0, 400);


    sky()

    camera = new THREE.PerspectiveCamera(60, width / height, .1, 10000);
    camera.position.y = 8;
    camera.position.z = 4;

    ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight)


    renderer = new THREE.WebGLRenderer({
        canvas: container,
        antialias: true
    });
    renderer.setPixelRatio = devicePixelRatio;
    renderer.setSize(width, height);


}

function sceneElements() {

    const geometry = new THREE.PlaneBufferGeometry(100, 400, 400, 400);

    const uniforms = {
        time: {
            type: "f",
            value: 0.0
        },
        scroll: {
            type: "f",
            value: 0.0
        },
        distortCenter: {
            type: "f",
            value: 0.1
        },
        roadWidth: {
            type: "f",
            value: 0.5
        },
        pallete: {
            type: "t",
            value: null
        },
        speed: {
            type: "f",
            value: 3
        },
        maxHeight: {
            type: "f",
            value: 10.0
        },
        color: new THREE.Color(1, 1, 1),
        hueEric: {
            type: "f",
            value: 3
        }
    }

    const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.basic.uniforms, uniforms]),
        vertexShader: document.getElementById('custom-vertex').textContent,
        fragmentShader: document.getElementById('custom-fragment').textContent,
        wireframe: false,
        fog: true
    });

    terrain = new THREE.Mesh(geometry, material);
    terrain.position.z = -180;
    terrain.rotation.x = -Math.PI / 2

    scene.add(terrain)

}

function sceneTextures() {

    // pallete
    new THREE.TextureLoader().load('pallete.png', function (texture) {
        terrain.material.uniforms.pallete.value = texture;
        terrain.material.needsUpdate = true;
    });
}

function sky() {
    sky = new THREE.Sky();
    sky.scale.setScalar(450000);
    sky.material.uniforms.turbidity.value = 13;
    sky.material.uniforms.rayleigh.value = 1.2;
    sky.material.uniforms.luminance.value = 1;
    sky.material.uniforms.mieCoefficient.value = 0.1;
    sky.material.uniforms.mieDirectionalG.value = 0.58;

    scene.add(sky);

    sunSphere = new THREE.Mesh(
        new THREE.SphereBufferGeometry(20000, 16, 8),
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        })
    );
    sunSphere.visible = false;
    scene.add(sunSphere);

    const theta = Math.PI * (-0.002);
    const phi = 2 * Math.PI * (-.25);

    sunSphere.position.x = 400000 * Math.cos(phi);
    sunSphere.position.y = 400000 * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = 400000 * Math.sin(phi) * Math.cos(theta);

    sky.material.uniforms.sunPosition.value.copy(sunSphere.position);
}

function resize() {
    width = window.innerWidth
    height = window.innerHeight
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

function onInputMove(e) {
    // e.preventDefault();

    //    var x, y
    //    if (e.type == "mousemove") {
    //        x = e.clientX;
    //        y = e.clientY;
    //    } else {
    //        x = e.changedTouches[0].clientX
    //        y = e.changedTouches[0].clientY
    //    }
    //
    //    mouse.x = x;
    //    mouse.y = y;

}

function render() {
    stats.begin();
    requestAnimationFrame(render);

    detectAudioBeats();


    // damping mouse for smoother interaction
    mouse.xDamped = lerp(mouse.xDamped, mouse.x, 0.1);
    mouse.yDamped = lerp(mouse.yDamped, mouse.y, 0.05);

    const time = performance.now() * 0.0005
    terrain.material.uniforms.time.value = time
    terrain.material.uniforms.scroll.value = time + map(mouse.yDamped, 0, height, 0, 4);
    terrain.material.uniforms.distortCenter.value = Math.sin(time) * 0.1;
    terrain.material.uniforms.roadWidth.value = map(mouse.xDamped, 0, width, 1, 4.5);




    //This would not be needed if shaders supported the out variable. But 3js hates tgat idk


    const PI = 3.1415926535897932384626433832795;


    var t = terrain.material.uniforms.time.value * terrain.material.uniforms.speed.value;
    var wRoad = terrain.material.uniforms.distortCenter.value;
    var wRoad2 = wRoad * 0.5;

    var angleCenter = 0 * PI * 4.0;
    angleCenter += t * 0.9;

    var centerOff = (
        Math.sin(angleCenter) +
        Math.sin(angleCenter * 0.5)
    ) * wRoad;

    var angle = (0 - centerOff) * PI;
    var f = Math.abs(Math.cos(angle));
    var h = Math.pow(f, 1.5 + terrain.material.uniforms.roadWidth.value);

    //console.log(camera.position.y)
    camera.position.x = map(h, 70, 100, -1, 2);
    camera.rotation.z = -angle;
    camera.position.y = (angle * 5) + 20;

    renderer.render(scene, camera);
    stats.end();

}

function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end
}
