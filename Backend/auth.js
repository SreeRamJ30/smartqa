const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Path to the Excel file containing user credentials
const usersFilePath = path.join(__dirname, 'users.xlsx');

/**
 * Creates a default users.xlsx file if it doesn't exist
 */
function ensureUsersFileExists() {
  if (!fs.existsSync(usersFilePath)) {
    console.log('Creating default users file...');
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Sample user data
    const userData = [
      { email: 'admin@example.com', password: 'admin123', fullName: 'Admin User' },
      { email: 'user@example.com', password: 'user123', fullName: 'Regular User' }
    ];
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(userData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    // Write to file
    XLSX.writeFile(wb, usersFilePath);
    console.log('Default users file created successfully.');
  }
}

/**
 * Get all users from the Excel file
 * @returns {Array} Array of user objects
 */
function getUsers() {
  ensureUsersFileExists();
  
  const workbook = XLSX.readFile(usersFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  return XLSX.utils.sheet_to_json(worksheet);
}

/**
 * Authenticate a user
 * @param {string} email User's email
 * @param {string} password User's password
 * @returns {Object|null} User object if authenticated, null otherwise
 */
function authenticateUser(email, password) {
  const users = getUsers();
  
  const user = users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password
  );
  
  if (user) {
    // Don't send the password back to the client
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
}

/**
 * Register a new user
 * @param {Object} userData User data object with email, password, and fullName
 * @returns {Object|null} Created user object or null if email already exists
 */
function registerUser(userData) {
  const users = getUsers();
  
  // Check if user already exists
  if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
    return null;
  }
  
  // Add new user
  const newUser = {
    email: userData.email,
    password: userData.password,
    fullName: userData.fullName
  };
  
  users.push(newUser);
  
  // Convert array back to worksheet
  const ws = XLSX.utils.json_to_sheet(users);
  
  // Create new workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  
  // Write to file
  XLSX.writeFile(wb, usersFilePath);
  
  // Don't send the password back to the client
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

module.exports = {
  authenticateUser,
  registerUser,
  getUsers
};