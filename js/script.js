const antonio = document.querySelector('.antonio');
const dog = document.querySelector('.dog')

const jump = () => {
  antonio.classList.add('jump');

  setTimeout(() => {
    antonio.classList.remove('jump');
  }, 500);
}

const loop = setInterval(() => {

  const dogPosition = dog.offsetLeft;
  const antonioPosition = +window.getComputedStyle(antonio).bottom.replace('px', '');

  if (dogPosition <= 100 && dogPosition > 0 && antonioPosition < 80) {
    
    dog.style.animation = 'none';
    dog.style.left = `${dogPosition}px`;

    antonio.style.animation = 'none';
    antonio.style.bottom = `${antonioPosition}px`;

    antonio.src = './images/end.png';
    antonio.style.width = '96px'
    antonio.style.marginLeft = '50px'
    dog.classList.add('hide')

    clearInterval(loop);
  }
}, 10);

document.addEventListener('keydown', jump);
