"use strict";

/* DOM */

const scanInput = document.getElementById("scanInput");
const scanBtn = document.getElementById("scanBtn");
const uploadBtn = document.getElementById("uploadBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageUpload = document.getElementById("imageUpload");
const resultDiv = document.getElementById("result");


/* BUTTON ACTIONS */

uploadBtn.onclick = () => imageUpload.click();
cameraBtn.onclick = () => imageUpload.click();


/* IMAGE PREVIEW */

imageUpload.onchange = function(){

const file = this.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = function(){

resultDiv.innerHTML = `
<img src="${reader.result}"
style="max-width:100%;border-radius:12px;margin-bottom:10px"/>

<div class="band">Screenshot uploaded</div>
<div class="score">Press scan</div>
`;

};

reader.readAsDataURL(file);

};


/* SCAN */

scanBtn.onclick = async function(){

const text = scanInput.value.trim();

if(!text){

resultDiv.innerHTML = `
<div class="band">EMPTY</div>
<div class="score">Paste message first</div>
`;

return;

}

try{

const response = await fetch("/check",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
text
})

});

const json = await response.json();

display(json.data);

}catch(err){

resultDiv.innerHTML = `
<div class="band">ERROR</div>
<div class="score">Server unavailable</div>
`;

}

};


/* DISPLAY RESULT */

function display(data){

const band = data?.band || "UNKNOWN";
const score = data?.score ?? "-";

resultDiv.className="nt-card nt-result";

if(band==="SAFE") resultDiv.classList.add("nt-safe");
if(band==="SUSPICIOUS") resultDiv.classList.add("nt-suspicious");
if(band==="CRITICAL") resultDiv.classList.add("nt-critical");

resultDiv.innerHTML = `
<div class="band">${band}</div>
<div class="score">Score: ${score}</div>
`;

}