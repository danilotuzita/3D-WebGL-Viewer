// ======================= // WEBGL CONTEXT // ======================= //
var gl;

function initGL(canvas)
{
    try
    {
        gl = canvas.getContext('webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }
    catch (e){}
    if(!gl)
    {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function webGLStart(model)
{
    var canvas = document.getElementById("canvas");
    initGL(canvas);
    initShaders();
    initBuffers(model);
    initTexture(model);

    gl.clearColor(0.12, 0.12, 0.12, 1.0);
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    //drawScene();
    tick();
}

// ======================= // SHADERS // ======================= //
function getShader(id)
{
    var shaderScript = document.getElementById(id);
    if (!shaderScript)
        return null;

    var str = "";
    var k = shaderScript.firstChild;
    while (k)
    {
        if (k.nodeType == 3)
            str += k.textContent;
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment")
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    else if (shaderScript.type == "x-shader/x-vertex")
        shader = gl.createShader(gl.VERTEX_SHADER);
    else
        return null;

    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;
function initShaders()
{
    var fragmentShader = getShader("shader-fs");
    var vertexShader = getShader("shader-vs");
    shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(shaderProgram));

    gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPos");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "texCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "pMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "mvMatrix");
    // shaderProgram.vMatrixUniform = gl.getUniformLocation(shaderProgram, 'vMatrix');
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "sampler");

    shaderProgram.texture = gl.getUniformLocation(shaderProgram, 'material');
}

// ======================= // TEXTURES // ======================= //
var Texture = [];
function initTexture(model)
{
    var n = model.materials.length;
    for(var i = 0; i < n; i++)
    {
        Texture[i] = gl.createTexture();
        var image = new Image();
        image.n = i;
        image.onload = function ()
        {
            gl.bindTexture(gl.TEXTURE_2D, Texture[this.n]);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);
            gl.bindTexture(gl.TEXTURE_2D, null);
        };
        var k = -1;
        for(var j = 0; j < model.materials[i].properties.length; j++)
        {
            if(model.materials[i].properties[j].key == '$tex.file')
                k = j;
        }
        if(k != -1)
            image.src = model.materials[i].properties[k].value;
        else
            image.src = 'Prediok2/missing_texture.jpg';
    }
}

// ======================= // MATRIX // ======================= //
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
// var vMatrix = mat4.create();

function setMatrixUniforms()
{
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    // gl.uniformMatrix4fv(shaderProgram.vMatrixUniform, false, vMatrix);
}

// ======================= // EVENTS // ======================= //
var currentlyPressedKeys = {};
function handleKeyDown(event)
{
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event)
{
    currentlyPressedKeys[event.keyCode] = false;
}

var pitch = 0;
var pitchRate = 0;
var yaw = 0;
var yawRate = 0;

var jump = 0;

var xPos = 0;
var yPos = 0.4;
var zPos = 0;
var forwardSpeed = 0;
var lateralSpeed = 0;

function handleKeys()
{
    if(currentlyPressedKeys[32])
        jump = 1;

    if (currentlyPressedKeys[38])// Page Up
        pitchRate = 0.1;
    else if (currentlyPressedKeys[40])// Page Down
        pitchRate = -0.1;
    else
        pitchRate = 0;

    if (currentlyPressedKeys[37])// Left cursor key or A
        yawRate = 0.1;
    else if (currentlyPressedKeys[39])// Right cursor key or D
        yawRate = -0.1;
    else
        yawRate = 0;

    if (currentlyPressedKeys[87])// Up cursor key or W
        forwardSpeed = .15;
    else if (currentlyPressedKeys[83])// Down cursor key
        forwardSpeed = -.15;
    else
        forwardSpeed = 0;

    if(currentlyPressedKeys[68])
        lateralSpeed = .15;
    else if(currentlyPressedKeys[65])
        lateralSpeed = -.15;
    else
        lateralSpeed = 0;

}

// ======================= // BUFFERS // ======================= //
var vertexBuffer = [];
var indexBuffer = [];
var textureBuffer = [];
var modelo, n;

function initBuffers(model)
{
    modelo = model;
    n = model.meshes.length;
    var materials = 0;
    for(var i = 0; i < n; i++)
    {
        // console.log("FOR");
        var vertexData = model.meshes[i].vertices;
        var indexData = [].concat.apply([], model.meshes[i].faces);
        var textureData;

        if(model.meshes[i].texturecoords)
        {
            textureData = model.meshes[i].texturecoords[0];
            // console.log(model.meshes[i].materialindex);
            textureBuffer[i] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer[i]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureData), gl.STATIC_DRAW);
            textureBuffer[i].numItems = textureData.length;
            textureBuffer[i].materialIndex = model.meshes[i].materialindex;
            materials++;
        }

        vertexBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer[i]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
        vertexBuffer[i].numItems = vertexData.length;

        indexBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer[i]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
        indexBuffer[i].numItems = indexData.length;
        // if(i == 8 || i == 13 || i == 20)
        //     console.log(vertexData);
            // console.log("index " + i + ": ", indexData.length, '\n', indexData, '\n', getMaxOfArray(indexData), '-', vertexData.length);
    }
    vertexBuffer.itemSize = 3;
    indexBuffer.itemSize = 1;
    textureBuffer.itemSize = 2;
    textureData.numMaterials = materials;
}

// ======================= // DRAW N' ANIMATION // ======================= //
function drawScene()
{
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    mat4.perspective(pMatrix, toRad(70), gl.viewportWidth / gl.viewportHeight, 0.1, 1000000.0);
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, mvMatrix, toRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix, toRad(-yaw), [0, 1, 0]);
    // mat4.rotate(mvMatrix, mvMatrix, toRad(+e), [1, 0, 1]);
    mat4.translate(mvMatrix, mvMatrix, [-xPos, -yPos, -zPos]);
    // mat4.lookAt(vMatrix, [xPos, yPos, zPos], [0.0, 0.0, 0.0], [0, 1, 0]);//Camera: (Position, Where's Looking, Which Direction is Up);

    for(var i = 0; i < n; i++)
    {
        mat4.translate(mvMatrix, mvMatrix, [-100, 0, 100]);
        var materials = 0;
        if(textureBuffer[i])
        {
            gl.activeTexture(33984 + textureBuffer[i].materialIndex);//gl.TEXTURE0 = 33984;
            gl.bindTexture(gl.TEXTURE_2D, Texture[textureBuffer[i].materialIndex]);
            gl.uniform1i(shaderProgram.samplerUniform, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer[i]);
            gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.uniform1i(shaderProgram.texture, 1.0);
            materials++;
        }
        else
            gl.uniform1i(shaderProgram.texture, 0.0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer[i]);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer[i]);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, indexBuffer[i].numItems, gl.UNSIGNED_SHORT, 0);
    }
}

var lastTime = 0;
// var joggingAngle = 0;
var down = 0;

function animate()
{
    var timeNow = new Date().getTime();
    if (lastTime != 0)
    {
        var elapsed = timeNow - lastTime;
        if(forwardSpeed != 0)
        {
            xPos -= Math.sin(toRad(yaw)) * forwardSpeed * elapsed;
            zPos -= Math.cos(toRad(yaw)) * forwardSpeed * elapsed;
            // joggingAngle += elapsed * 100; // 0.6 "fiddle factor" - makes it feel more realistic :-)
            // yPos = Math.sin(toRad(joggingAngle)) / 20 + .4;
        }
        if(lateralSpeed != 0)
        {
            xPos -= Math.sin(toRad(yaw - 90)) * lateralSpeed * elapsed;
            zPos -= Math.cos(toRad(yaw - 90)) * lateralSpeed * elapsed;
        }
        if(jump)//Gravity
        {
            if(down == 0)
            {
                yPos += 0.25 * elapsed;
            }
            if(yPos >= 100 || down == 1)
            {
                yPos -= 0.25 * elapsed;
                down = 1;
            }
            if(yPos <= 0)
            {
                yPos = 0;
                jump = 0;
                down = 0;
            }
        }
        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;
    }
    lastTime = timeNow;
}

function tick()
{
    requestAnimationFrame(tick);
    handleKeys();
    drawScene();
    animate();
}


////////////8 13 20