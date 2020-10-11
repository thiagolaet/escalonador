const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');

var CPU1, CPU2, CPU3, CPU4;
var simulatorTime = 0;
var processes = [];

function start() {
  toggleClasses();
  setInterval(() => {
    document.querySelector(".simulator").textContent = simulatorTime;
    simulatorTime += 1;
  }, 1000);
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
  processes.pop();  

  // Exibindo a lista de processos na tela
  let outputText = "";
  for (i=0; i < processes.length; i++) {
    outputText += `Processo ${i}: ${processes[i]}<br>`
  }
  document.getElementById('output').innerHTML=outputText;
  
  // Transformando os processos de listas para objetos (facilita a leitura)
  for(i=0;i<processes.length;i++) {
    processes[i] = processes[i].replaceAll(" ", "");
    processes[i] = processes[i].split(',');
    processes[i] = {
      arrivalTime: parseInt(processes[i][0]),
      priority: parseInt(processes[i][1]),
      processorTime: parseInt(processes[i][2]),
      mBytes: parseInt(processes[i][3]),
      printer: parseInt(processes[i][4]),
      disk: parseInt(processes[i][5])
    }
  }

  // Ordenando os processos por arrivalTime
  processes.sort((a, b) => {
    return a.arrivalTime - b.arrivalTime;
  })

  console.log(processes);
}

document.getElementById('input').addEventListener('change', function() { 
  var fr=new FileReader(); 
  fr.onload=function(){ 
    fillProcesses(fr.result);
    console.log(processes);
  } 
    
  fr.readAsText(this.files[0]); 
});