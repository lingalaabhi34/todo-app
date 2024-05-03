
function isEmailRegex(email) {
    const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(String(email).toLowerCase());
  }
  function isStrongPassword(password) {
    // Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
    return regex.test(password);
  }
const userdatavaliadations=({name,email,username,password})=>{
    return new Promise((resolve,reject)=>{
         // Check if any field is missing
        if (!name || !username || !email || !password)
        return reject("Missing user credentials");
     // Validate name
        if (typeof name !== "string" || name.trim().length === 0)
        return reject("Name should be a non-empty string");
    // Validate email
        if (typeof email !== "string" || !isEmailRegex(email))
        return reject("Invalid email format");
        // Validate password
        // if (typeof password !== "string" || !isStrongPassword(password))
        // return reject("Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character");
  
      // Validate username
      if (typeof username !== "string" || username.trim().length < 3 || username.trim().length > 50)
        return reject("Username should be a string between 3 and 50 characters");
       resolve(); 
    })
}

module.exports = {userdatavaliadations,isEmailRegex}