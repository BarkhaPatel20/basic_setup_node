document.addEventListener("DOMContentLoaded", function () {
   var input = document.querySelector("#phone");
   var iti = window.intlTelInput(input, {
      preferredCountries: ["us"], // Set the preferred country to United States
      initialCountry: "auto", // Use auto-detection or set it to a default
      separateDialCode: true,
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.min.js", // Utility script
   });

   // Force the country to United States after initialization
   iti.setCountry("us"); // This ensures 'US' is selected regardless of detection

   // Update hidden input field with full phone number
   input.addEventListener("input", function () {
      var fullPhoneNumber = iti.getNumber();
      var countryCode = '+' + iti.getSelectedCountryData().dialCode;

      document.querySelector("#fullPhoneNumber").value = fullPhoneNumber;
      document.querySelector("#countryCode").value = countryCode;
   });

   // Initialize hidden field with the current value on page load
   var fullPhoneNumber = iti.getNumber();
   var countryCode = '+' + iti.getSelectedCountryData().dialCode;
   document.querySelector("#fullPhoneNumber").value = fullPhoneNumber;
   document.querySelector("#countryCode").value = countryCode;
});

// document.addEventListener("DOMContentLoaded", function () {
//    var input = document.querySelector("#phone");
//    var iti = window.intlTelInput(input, {
//       preferredCountries: ["us"], // Set the preferred country to United States
//       initialCountry: "us", // Explicitly set the initial country to United States
//       separateDialCode: true,
//       utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.min.js", // Utility script
//    });

//    // Update hidden input field with full phone number
//    input.addEventListener("input", function () {
//       var fullPhoneNumber = iti.getNumber();
//       var countryCode = '+' + iti.getSelectedCountryData().dialCode;

//       document.querySelector("#fullPhoneNumber").value = fullPhoneNumber;
//       document.querySelector("#countryCode").value = countryCode;
//    });

//    // Initialize hidden field with the current value on page load
//    var fullPhoneNumber = iti.getNumber();
//    var countryCode = '+' + iti.getSelectedCountryData().dialCode;
//    document.querySelector("#fullPhoneNumber").value = fullPhoneNumber;
//    document.querySelector("#countryCode").value = countryCode;
// });
