const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');
const outputDiv = document.getElementById('output');

var processes = [];
var time = 0;

function start() {
  toggleClasses();
  initialize();
}

function toggleClasses() {
  menuDiv.classList.toggle('hidden');
  simulatorDiv.classList.toggle('hidden');
}

function finish() {

}

function menu() {
  finish();
  toggleClasses();
}

function fillProcesses(text) {
  processes = text.split("\n");
}

document.getElementById('input').addEventListener('change', function() { 
  var fr=new FileReader(); 
  fr.onload=function(){ 
    fillProcesses(fr.result);
    for (i=0; i < processes.length; i++) {
      outputDiv.innerHTML += `Processo ${i}: ${processes[i]}<br>`;
    }
  } 
  outputDiv.classList.remove('hidden');
    
  fr.readAsText(this.files[0]); 
})