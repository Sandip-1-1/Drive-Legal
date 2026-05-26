import createGame from './game/Game';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111827';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root element');
}

root.style.width = '100vw';
root.style.height = '100vh';

createGame('root');