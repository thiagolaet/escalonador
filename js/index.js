const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');

var processes = [];

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
    document.getElementById('output').innerHTML=fr.result.replaceAll("\n", "<br>");
  } 
    
  fr.readAsText(this.files[0]); 
})