import connection  from '../config.js'
function setGuestId() {
    let guestId = getCookie("guestId");
    if (!guestId) {
      guestId = generateUUID(); // Generate a unique ID
      document.cookie = `guestId=${guestId}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    }
    return guestId;
  }
  
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
  
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  