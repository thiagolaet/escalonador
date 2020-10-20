const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');
const outputDiv = document.getElementById('output');
const fileInput = document.getElementById('input');
const timer = document.getElementById('timer');
const ready1Output = document.getElementById('ready1');

var CPU1, CPU2, CPU3, CPU4;
var simulatorTime = 0;
var processes = [];
var ready1 = [];
var ready2 = [];
var ready3 = [];

// Inicia o simulador
function start() {
  toggleClasses();
  setInterval(() => {
    if (processes.length > 0) checkProcesses();
    
    // Atualizando o timer
    timer.textContent = `Tempo: ${simulatorTime}`;
    simulatorTime += 1;
    console.log(processes);
    console.log(ready1);

    updateReady();
  }, 1000);
}

// Compara os tempos de chegada do array de processos com o tempo atual do simulador e adiciona esses processos na lista de prontos
function checkProcesses() {
  while (processes[0].arrivalTime <= simulatorTime) {
    ready1.push(processes[0]);
    processes.shift();
  }
}

// Atualiza as filas de pronto
function updateReady() {
  ready1Output.innerHTML = '';
  ready1.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem')
    li.textContent = e.name;
    ready1Output.appendChild(li);
  });
}

// Altera entre a visualização do menu e do simulador
function toggleClasses() {
  menuDiv.classList.toggle('hidden');
  simulatorDiv.classList.toggle('hidden');
}

// Força a terminação da simulação atual
function finish() {

}

// Termina a simulação atual e retorna ao menu
function menu() {
  finish();
  toggleClasses();
}

// Preenche a lista de objetos processos e atualiza o output relativo a eles no menu
function fillProcesses(text) {

  // Filtrando o input recebido pelo arquivo de texto
  processes = text.split('\n').filter((e) => e.length >= 6);

  // Inicializando a string que irá receber o texto para o output
  let outputText = '';
  
  // Transformando os processos de listas para objetos (facilita a leitura) e concatenando a string de output
  for(i=0;i<processes.length;i++) {
    outputText += `Processo ${i}: ${processes[i]}<br>`
    processes[i] = processes[i].replaceAll(' ', '');
    processes[i] = processes[i].split(',');
    processes[i] = {
      name: `P${i}`,
      arrivalTime: parseInt(processes[i][0]),
      priority: parseInt(processes[i][1]),
      processorTime: parseInt(processes[i][2]),
      mBytes: parseInt(processes[i][3]),
      printer: parseInt(processes[i][4]),
      disk: parseInt(processes[i][5])
    }
  }

  // Atualizando a string de output
  outputDiv.innerHTML=outputText;

  // Ordenando os processos por arrivalTime
  processes.sort((a, b) => {
    return a.arrivalTime - b.arrivalTime;
  })

  console.log(processes);
}

// Altera a lista de processos quando é recebido um input de arquivo
fileInput.addEventListener('change', function() { 
  var fr=new FileReader(); 
  fr.onload=function(){ 
    fillProcesses(fr.result);
  } 
  outputDiv.classList.remove('hidden');
    
  fr.readAsText(this.files[0]); 
});