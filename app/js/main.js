$(document).ready(function(){
    hide_top();

    $('.file_upload').find('input:file').hide();
    $('.up_btn').click(function(){
        $(this).parent().find('input:file').trigger('click');
    });
    
    $('.file_upload input:file').change(function(){
        var output = $(this).val().split('\\');
        $(this).parent().find('.up_field').html('<span>'+ output[output.length-1] +'</span>');
    });

    $('form#docupload').submit(function(evt) {
        evt.preventDefault();

        $('div.progress').show();
        var formData = new FormData();
        var file = document.getElementById('myFile').files[0];
        formData.append('myFile', file);
        formData.append('types',$("#myType").val());
        formData.append('types',$("#myCheck").val());

        var xhr = new XMLHttpRequest();

        xhr.open('post', '/user/docload', true);

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var percentage = (e.loaded / e.total) * 100;
                $('div.progress div.bar').css('width', percentage + '%');
            }
        };

        xhr.onerror = function(e) {
            alert('An error occurred while submitting the form. Maybe your file is too big');
            $('div.progress').hide();
        };

        xhr.onload = function() {
            var sts ="";
            if(this.statusText  == "OK"){sts = "Ваш файл успешно загружен"}else{sts= "Файл не загружен может быть из-за большой объёма."};
            alert(sts);
            $('div.progress').hide();
            var hr = "/user/upload";
            window.location = hr;


        };

        xhr.send(formData);

    });



//    gen_list();

    /*Checking free click*/
    $(document).click(function(e){ 
        var elem = $(".item.show"); 
        if(e.target!=elem[0] && !elem.has(e.target).length){ 
            elem.removeClass('show');
            elem.find('.popup').fadeOut("fast");
        }

        elem = $(".select_list");
        if(e.target!=elem[0] && !elem.has(e.target).length){ 
            elem.find('current').removeClass('opened');
            elem.find('.value_list').fadeOut("fast");
        }

    });

    /*-------------------*/

    $('.select_list .current').click(function(){
        /**/
        if($(this).hasClass('opened')){
            $(this).parent().find('.value_list').fadeOut("fast");
            $(this).removeClass('opened');
        }else{
            $('.select_list').each(function(){
                $(this).find('.value_list').fadeOut("fast").parent().find('.current').removeClass('opened');
            });
            $(this).parent().find('.value_list').fadeIn("fast").jScrollPane();
            $(this).addClass('opened');
            
        }
        //$(this).parent().find('.value_list').fadeToggle("fast").jScrollPane();
    });


    $('.value_list li').click(function(){
       var list_value = $(this).data('id');
       var list_name = $(this).text();
       var dom = $(this).parent().parent().parent();

       dom.parent().parent().find('.current').removeClass('opened').children('span').text(list_name);
       dom.find('input').val(list_value);
       dom.parent().parent().find('.value_list').fadeOut("fast");
    });

    $(".close_balert").click(function(){
       $(".balert").hide();
    });

    $(".click_doc").click(function(){
       var hr = $(this).attr('id');
       var hr2 = $(this).attr('alt');
        //w = window.open();
        window.location = hr;
        if(hr2.length>0){

            w = window.open();
            w.location = hr2;
        }

    });

    $("#other_doc").click(function(){
        var hr = "/user/company";
        window.location = hr;
    });


    $(".hide_top").click(function(){
        //var mydate = new Date();
        //mydate.setMonth(mydate.getMonth()+12);
       /// document.cookie = 'hide_top'+'='+';expires='+mydate+';domain=.localhost:3000;path=/';
        $(".info_block").hide();
        $(".notebook_pic").hide();
        $("#top_gradient").addClass('short');
        $("#top_gradient2").addClass('short');
        document.cookie="hide_top";

    });

    function hide_top()
    {
        if(document.cookie.length > 0){
            $(".info_block").hide();
            $(".notebook_pic").hide();
            $("#top_gradient").addClass('short');
            $("#top_gradient2").addClass('short');
        }
    }


    $(".print_btn").click(function(){
        w = window.open();
        w.document.write("<h1 style='color:#ccc;border-bottom:1px solid #ccc; width:100%;'>Распечатано на www.emitent.uz</h1>"+$(".sheet2").html());
        w.print();
        w.close();
    }) ;

});

function gen_list(){
    $('select').each(function(){
        var val_name = $(this).attr('name');
        var value_d = $(this).val();
        var selected = false;
        $(this).parent().append('<div class="arrow"></div><div class="current"><span></span></div><input type="hidden" name="'+ val_name +'" value="'+ value_d +'"><div class="value_list"><ul></ul></div>');
        var block_list = $(this).parent().find('.value_list ul');
        var show_current = block_list.parent().parent();
        block_list.width($(this).parent().width());
        $(this).children('option').each(function(){
            if($(this).attr('selected')){
                selected = true;
                show_current.find('.current span').text($(this).text())
                show_current.find('input').val($(this).val())
            }else{
                //alert($(this).width());
                block_list.append('<li data-id="'+ $(this).val() +'">'+ $(this).text() +'</li>');
            }
        });
        if(!selected){
            show_current.find('input').val($(this).children('option').first().val())
            show_current.find('.current span').text($(this).children('option').first().text())
        }
        $(this).remove();
    });
}

