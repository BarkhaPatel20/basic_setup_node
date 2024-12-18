$('.selectall-1').click(function() {
    if ($(this).is(':checked')) {
        $('.justone-1').prop('checked', true);
        var total = $('input[name="options1[]"]:checked').length;
        $(".dropdown-text-1").html('(' + total + ') Selected');
        $(".select-text-1").html(' Deselect');
    } else {
        $('.justone-1').prop('checked', false);
        $(".dropdown-text-1").html('(0) Selected');
        $(".select-text-1").html(' Select');
    }
});

$("input[type='checkbox'].justone-1").change(function(){
    var a = $("input[type='checkbox'].justone-1");
    if(a.length == a.filter(":checked").length){
        $('.selectall-1').prop('checked', true);
        $(".select-text-1").html(' Deselect');
    }
    else {
        $('.selectall-1').prop('checked', false);
        $(".select-text-1").html(' Select');
    }
    var total = $('input[name="options1[]"]:checked').length;
    $(".dropdown-text-1").html('(' + total + ') Selected');
});

// For Dropdown 2
$('.selectall-2').click(function() {
    if ($(this).is(':checked')) {
        $('.justone-2').prop('checked', true);
        var total = $('input[name="options2[]"]:checked').length;
        $(".dropdown-text-2").html('(' + total + ') Selected');
        $(".select-text-2").html(' Deselect');
    } else {
        $('.justone-2').prop('checked', false);
        $(".dropdown-text-2").html('(0) Selected');
        $(".select-text-2").html(' Select');
    }
});

$("input[type='checkbox'].justone-2").change(function(){
    var a = $("input[type='checkbox'].justone-2");
    if(a.length == a.filter(":checked").length){
        $('.selectall-2').prop('checked', true);
        $(".select-text-2").html(' Deselect');
    }
    else {
        $('.selectall-2').prop('checked', false);
        $(".select-text-2").html(' Select');
    }
    var total = $('input[name="options2[]"]:checked').length;
    $(".dropdown-text-2").html('(' + total + ') Selected');
});

// Search for Dropdown 1
$('.search-dropdown-1').on('keyup', function() {
    var value = $(this).val().toLowerCase();
    $('.dropdown-menu li a').filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});

// Search for Dropdown 2
$('.search-dropdown-2').on('keyup', function() {
    var value = $(this).val().toLowerCase();
    $('.dropdown-menu li a').filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});
