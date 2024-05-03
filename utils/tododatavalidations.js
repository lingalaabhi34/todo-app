const tododatavalidation = ({ todotext }) => {
  return new Promise((resolve, reject) => {
    if (!todotext) reject("Missing todo text");
    if (todotext.length < 3 || todotext > 100)
      reject("Todo length should be 3-100");
    resolve();
  });
};
module.exports = { tododatavalidation };
