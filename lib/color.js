const chalk = require('chalk');
const figlet = require('figlet');

const PREFIX = chalk.greenBright('[⚡XenoviaBot ]');

const banner = (text = "Xenovia AI") =>
  chalk.cyan(figlet.textSync(text, { font: "Slant" }));

const color = (text, clr = 'green') => chalk.keyword(clr)(text);

const bgcolor = (text, bg = 'black') => chalk.bgKeyword(bg)(text);

const mylog = (text, clr = 'cyan') =>
  `${PREFIX} ${chalk.keyword(clr)(text)}`;

const infolog = (text) =>
  `${PREFIX} ${chalk.magentaBright(text)}`;

const warnlog = (text) =>
  `${PREFIX} ${chalk.yellowBright('[WARN]')} ${chalk.white(text)}`;

const errorlog = (text) =>
  `${PREFIX} ${chalk.redBright('[ERROR]')} ${chalk.white(text)}`;

const successlog = (text) =>
  `${PREFIX} ${chalk.greenBright('[OK]')} ${chalk.white(text)}`;

module.exports = {
  color,
  bgcolor,
  mylog,
  infolog,
  warnlog,
  errorlog,
  successlog,
  banner
};