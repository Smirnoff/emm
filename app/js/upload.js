$(function() {

  var showInfo = function(message) {
    //$('div.progress').hide();
    $('strong.message').text(message);
      //$('#shmsg').show();
    //$('div.alert').show();
  };


  $('input[type="submit"]').on('click', function(evt) {
    evt.preventDefault();
    //$('div.progress').show();
    var formData = new FormData();
    var file = document.getElementById('myFile').files[0];
    formData.append('myFile', file);
    
    var xhr = new XMLHttpRequest();
    
    xhr.open('post', 'doc_upload', true);
    
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        var percentage = (e.loaded / e.total) * 100;
        //$('div.progress div.bar').css('width', percentage + '%');
      }
    };
    
    xhr.onerror = function(e) {
     alert("yuklamadi :(");
      //showInfo('An error occurred while submitting the form. Maybe your file is too big');
    };
    
    xhr.onload = function() {
      //showInfo("Yuklandi");
       location.reload();
       alert('Yuklandi :)');
    };
    
    xhr.send(formData);
    
  });
  
});