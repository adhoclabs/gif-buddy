function changeSetting(id, val) {
	console.log(id, val);

	$.ajax({
		url: '/api/configure', 
		type: 'POST', 
		contentType: 'application/json', 
		data: JSON.stringify({ type: id, value: val })}
	)
}

function hexColor(colorVal) {
    var parts = colorVal.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    delete(parts[0]);
    for (var i = 1; i <= 3; ++i) {
        parts[i] = parseInt(parts[i]).toString(16);
        if (parts[i].length == 1) parts[i] = '0' + parts[i];
    }
    return '#' + parts.join('');
}

function hexIntToHex(hexInt) {
	return '#' + hexInt.toString(16);
}

$(document).ready(function() {
	
	var clipboard = new Clipboard('.btn');

    // animate color picker

    $(".color-button").click(function( event ) {

    	if ($("#color-picker").is(":visible")) {
    		$("#color-picker").slideUp("fast");
    	} else {
    		$("#color-picker").slideDown("fast");
    	}

	});

	$(document).foundation();

	$('.color-cell').click(function (event) {

		// convert RBG to hex
		var x = $(this).css('backgroundColor');
	    var hexString = hexColor(x);
	    var hexInt = parseInt(hexString.replace(/^#/, ''), 16);
	    changeSetting("hexColor", hexInt);
	});

	$(".switch-input").change(function() {
        changeSetting(this.id, this.checked);
	});

	$("#autoReplyText").blur(function() {
		console.log($(this).val());
		if ($(this).val().length > 0) {
			changeSetting(this.id, $(this).val());
		}
	});

	$("#name").blur(function() {
		console.log($(this).val());
		if ($(this).val().length > 0) {
			changeSetting(this.id, $(this).val());
		}
	});

});

