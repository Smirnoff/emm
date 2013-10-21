/*
 *
 * Avesta Investment Group
 *
 */

var express = require("express"),
    engines = require('./consolidate'),
    check = require('./validator').check,
    sanitize  = require('./validator').sanitize,
    path  = require('path'),
    fs    = require('fs'),
    app = express(),
    mongoose = require('mongoose'),
    crypto = require('crypto'),
    sys = require('sys'),
    dbmessage = '',
    apptitle = "Эмитенты Узбекистана",
    pdfpost  = "http://test1.ru/examples/test.php",
    MemoryStore = require('connect').session.MemoryStore,
    analytics = require('analytics-node'); // this is a new analytics for node.js
    analytics.init({secret: 'cauv49zzp147c5ur3cr5'}); // this line initializes the node.js analytics


/*
 * UserSchema
 *
 */
UserSchema = new mongoose.Schema({
    username:'string',
    password:'string',
    organization:'string',
    inn:'string',
    phone:'string',
    fax : 'string',
    call:'string',
    adress:'string',
    fio:'string',
    status:'string'
});

AdminSchema = new mongoose.Schema({
    username:'string',
    password:'string'
});

ListSchema = new mongoose.Schema({
    title:'string'
});

DocSchema = new mongoose.Schema({
    body:'string',
    types:'string',
    check:'string',
    date:'string',
    from:'string',
    href:'string',
    t:'string'
});


app.configure(function () {
    app.use(express.logger());
    app.use(express.bodyParser({
        keepExtensions: true,
        uploadDir: __dirname + '/tmp',
        limit: '2mb'
    }));
    app.use(express.methodOverride());

    app.use(express.cookieParser());
    app.use(express.session(
        {secret:"secret key", store:new MemoryStore()}));
    app.use(express.static(__dirname + '/app'));

    app.engine('html', engines.underscore);

    /*
     Set views directory. DO NOT set this with the same static directory!.
     */
    app.set('views', __dirname + '/app/views');
    app.set('view engine', 'html');
    var port = process.env.PORT || 3000;
    var mongoUri = process.env.MONGOLAB_URI ||
      process.env.MONGOHQ_URL ||
      'mongodb://localhost/contacts';
    app.set('PORT', port);

    // MongoDB for development
    app.set('MONGODB_DEV', mongoUri);

    /**
     * MongoDB for production
     *
     * HardCode for demo purpose only
     */
    //app.set('MONGODB_PROD', 'mongodb://usernam:password@domainmu.com:212/contacts');

    /**
     * NODE_ENV=development
     */
    if ('development' == app.get('env')) {
        app.set('MONGODB_CONN', app.get('MONGODB_DEV'));
    }

    /**
     * NODE_ENV=production
     */
    if ('production' == app.get('env')) {
        app.set('MONGODB_CONN', app.get('MONGODB_PROD'));
    }

});

/* ==================================
 * MongoDB connection using Mongoose
 */

var db = mongoose.createConnection(app.get('MONGODB_CONN')),
    User = db.model('users', UserSchema),
    Admin = db.model('admins', AdminSchema);
    Doc = db.model('docs', DocSchema);
    Listcat = db.model('listcat', ListSchema);

db.on('connected', function () {
    console.log('Connect database MongoDB.');
    dbmessage = 'Connect database MongoDB.';
});

db.on('error', function () {
    console.error.bind(console, 'Connection error!');
    dbmessage = 'MongoDB error!';
});

//Admin.remove({},function(er,l){console.log(l);});

Admin.find({}, function (err, user) {
    if(user.length>0){
    }else{
        var admin = new Admin({
            username:'admin',
            password:crypto.createHash('md5').update('admin').digest("hex")
        });

        admin.save();
    }
});

/* ------------------------------------------------  ADMIN -----------------------------------------------------------*/

var check_admin = function(req,res,next){
    if (req.session.loggedAd) {
        Admin.find({_id:req.session.loggedAdId},function(er,user){
           if(user.length>0)
           {
               next();
           }else{
               res.redirect('/admin/logout');
           }
        });
    }else{
        res.redirect('/admin/logout');
    }
}

app.get('/admin', function (req, res) {
         res.render("admin", {title:apptitle,message:''});
});

app.post("/admin/login", function (req, res) {
    var username = req.body.username;
    var password = crypto.createHash('md5').update(req.body.password).digest("hex");

    Admin.find({username:username,password:password}, function (err, user) {
                 if(user.length>0){
                    req.session.loggedAd = true;
                    req.session.loggedAdId = user[0]['_id'];
                    res.redirect('/admin/users');
                }else{
                     res.redirect('admin');
                }
        });
});

app.get('/admin/change',check_admin,function(req,res){
       res.render("admin/change", {title:apptitle});
});


app.get('/admin/list',check_admin,function(req,res){
    Listcat.find({},function(er,list){
            res.render("admin/list", {title:apptitle,listcat:list});
        });
});

app.post("/admin/list_add", function (req, res) {
    var titles = req.body.title;
    console.log(titles);
    var list = new Listcat({
        title:titles
    });

    list.save();
    res.redirect('/admin/list');
});

app.post("/admin/list_change", function (req, res) {
    var ides = req.body.ides;
    var titles = req.body.title;
    Listcat.findOne({_id:ides},function(err,d){
        d.title  = titles;
        d.save();

    });
    res.redirect('/admin/list');
});


app.post("/admin/change_log", function (req, res) {
    var username = req.body.username;
    var password = crypto.createHash('md5').update(req.body.password).digest("hex");
    var reppassword = crypto.createHash('md5').update(req.body.reppassword).digest("hex");
   if(password == reppassword){
      Admin.findOne({_id:req.session.loggedAdId},function(err,d){
          d.username  = username;
          d.password  = password;

          req.session.loggedAdId = "";
          d.save();
          res.redirect('admin/logout');
      });
   }else{
       res.redirect('admin/change');
   }
});


app.get('/admin/logout', function (req, res) {
    req.session.loggedAd = false;
    req.session.loggedAdId ="";
    res.redirect('admin');
});

app.get('/admin/docs',check_admin,function(req,res){
        Doc.find({}).sort({ _id : -1 } ).execFind(function(err,list){
            User.find({},{organization:1},
                function(err,user) {
                     res.render("admin/docs", {title:apptitle,listdoc:list,list_d:list,dates:"",userlist:user});
                });
        });
});


app.get("/admin/docs/del/:id?",check_admin,function(req,res){
        Doc.findOne({_id:req.params.id},function(err,d){d.remove(); res.redirect('admin/docs'); });
});



app.get("/admin/docs/show/:id?",check_admin,function(req,res){
        Doc.findOne({_id:req.params.id},function(err,list){
            res.render("admin/doc_view", {title:apptitle,listuser:list});
        });
});

app.get("/admin/docs/show_date/:date?",check_admin,function(req,res){
        Doc.find({date:req.params.date}).sort({ _id : -1 } ).execFind(function(err,list){
            Doc.find({}).sort({ _id : -1 } ).execFind(function(err,list_d){
                User.find({},{organization:1},
                    function(err,user) {
                        res.render("admin/docs", {title:apptitle,listdoc:list,list_d:list_d,dates:req.params.date,userlist:user});
                    });
            });
        });
});

app.get("/admin/docs/print/:date?",check_admin,function(req,res){

    Doc.find({date:req.params.date}).sort({ _id : -1 } ).execFind(function(err,list){

            User.find({},{organization:1},
                function(err,user) {
                    res.render("admin/print_doc", {title:apptitle,listdoc:list,userlist:user});
                });
    });
});

app.get('/admin/users',check_admin,function(req,res){
         User.find({}).sort({ _id : -1 } ).execFind(function(err,list){
             User.find({status:1},function(er,lon){
                 User.find({status:0},function(er,loff){
                     res.render("admin/users", {
                         title:apptitle,
                         listuser:list,
                         liston:lon,
                         listoff:loff,
                         ch:'all'
                     });
                 });
             });
          });
});

app.get('/admin/users/:chs?',check_admin,function(req,res){
        User.find({}).sort({ _id : -1 } ).execFind(function(err,list){
            User.find({status:1},function(er,lon){
                User.find({status:0},function(er,loff){
                    res.render("admin/users", {
                        title:apptitle,
                        listuser:list,
                        liston:lon,
                        listoff:loff,
                        ch:req.params.chs
                    });
                });
            });
        });
});

app.get("/admin/users/del/:id?",check_admin,function(req,res){
    var ids = req.params.id;
        User.findOne({_id:ids},function(err,d){
                d.remove();
             Doc.find({from:ids},function(er,dd){
                Doc.remove({from:ids},function(er,dd){
                    res.redirect('admin/users');
                });

             });
        });
});



app.post("/admin/users/change_pwd",check_admin,function(req,res){
    var ides = req.body.ides;
    var pwd  = req.body.new_pwd;
    console.log(pwd);
    User.findOne({_id:ides},function(err,d){
        d.password  =crypto.createHash('md5').update(pwd).digest("hex");
        d.save();
    });
    res.redirect('/admin/users/show/'+ides);
});


app.get("/admin/users/show/:id?",check_admin,function(req,res){
        User.findOne({_id:req.params.id},function(err,list){
            res.render("admin/basic", {title:apptitle,listuser:list});
        });
});

app.get("/admin/users/changests/:sts.:id?",check_admin,function(req,res){
        User.findOne({_id:req.params.id},function(err,d){
            if(req.params.sts == '0' || req.params.sts == '1')
            {
                d.status = req.params.sts;
            }else{
                d.status = '0';
            }
            d.save();
            res.redirect('admin/users');
        });
});


/* ------------------------------------------------  USER ----------------------------------------------------------- */
var check_user = function(req,res,next){
    if (req.session.loggedIn) {
        User.find({_id:req.session.loggedId},function(er,user){
            if(user.length>0)
            {
                next();
            }else{
                res.redirect('/logout');
            }
        });
    }else{
        res.redirect('/logout');
    }
}

app.get("/", function (req, res) {
        res.redirect('user/home');
});

app.get("/user/login", function (req, res) {
        res.render('index', {
            title:apptitle,
            message:'',
            username:req.session.loggedUs
        });
});

// To add new pages, copy from here
/*app.get("/user/about", function (req, res) {
        res.render('user/about', {
            title:apptitle,
            message:'',
            username:req.session.loggedUs
        });
});
*/

function getNowDate()
{
    date = new Date();
    var Year  = date.getFullYear();
    var month = date.getMonth()+1;
    month = (month<10 ? "0":"")+month;
    var day   = date.getDate();
    day = (day<10 ? "0":"")+day;

    var dates = Year+"."+month+"."+day;
    return dates;
}

app.get('/user/change',check_user, function (req, res) {
    res.render("user/change", {
        title:apptitle,
        msg: "",
        username:req.session.loggedUs,
        usercheck:req.session.loggedIn
    });
});

app.post('/user/change_pwd',check_user, function(req, res){
    var oldpwd = req.body.oldpwd;
    var newpwd = req.body.newpwd;
    var repnewpwd = req.body.repnewpwd;
    User.find({username:req.session.loggedUs, password:crypto.createHash('md5').update(oldpwd).digest("hex")}, function (err, user) {
        if(user.length>0)
        {
            if(newpwd == repnewpwd)
            {
                if(newpwd.length>5 && repnewpwd.length>5){
                    User.findOne({username:req.session.loggedUs, password:crypto.createHash('md5').update(oldpwd).digest("hex")}, function (err, user_ch) {
                        user_ch.password  =crypto.createHash('md5').update(newpwd).digest("hex");
                        user_ch.save();
                    });

                    res.render("user/change", {
                        title:apptitle,
                        msg: "Пароль изменен",
                        username:req.session.loggedUs,
                        usercheck:req.session.loggedIn
                    });
                }else{
                    res.render("user/change", {
                        title:apptitle,
                        msg: "Пароль не должен быть меньше чем 6 символов.",
                        username:req.session.loggedUs,
                        usercheck:req.session.loggedIn
                    });
                }
            }else{
                res.render("user/change", {
                    title:apptitle,
                    msg: "Пароли не совпадают.",
                    username:req.session.loggedUs,
                    usercheck:req.session.loggedIn
                });
            }

        }else{
            res.render("user/change", {
                title:apptitle,
                msg: "Старый пароль не правильный.",
                username:req.session.loggedUs,
                usercheck:req.session.loggedIn
            });
        }

    });

});

app.get('/user/registration', function (req, res) {
    res.render("user/registration", {
        title:apptitle,
        org:"",
        adr:"",
        tel:"",
        fax:"",
        em:"",
        inn:"",
        fio:"",
        message:''
    });
});

var Limit = 10;
app.get('/user/home/:page?', function (req, res) {
  // console.log(new Buffer("XA==",'base64').toString('ascii'));
        var dates = getNowDate();
        var page = req.params.page;
        if(page == null){ page = 0};
        Doc.find({}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function (err, list){
                  User.find({},{organization:1},
                      function(err,user) {
                          Doc.find({},{_id:1},function(er,lf){
                              Listcat.find({},function(er,lists){
                          res.render("user/home",{
                              title:apptitle,
                              listdoc:list,
                              listcn:lf.length,
                              last:Math.floor(lf.length/ Limit),
                              limits:Limit,
                              users:user,
                              dates:dates,
                              pages:page,
                              username:req.session.loggedUs,
                              usercheck:req.session.loggedIn,
                              catlist:lists
                      });
                              });
                          });
                      });

        });
});

app.post('/user/login', function (req, res) {

    User.find({username:req.body.username, password:crypto.createHash('md5').update(req.body.password).digest("hex")}, function (err, user) {

        if (user.length > 0) {
          if(user[0]["status"] == '1'){

            req.session.loggedIn = true;
            req.session.loggedId = user[0]['_id'];
            req.session.loggedUs = user[0]['username'];
            res.redirect('user/home');
          }else{
              req.session.loggedIn = false;
              res.redirect('/show_reg');
          }
        } else {
            res.render('index', {
                title:apptitle,
                message:'<div class="alert alert-error"><a href="">&times;</a></button>Неправилно введён пароль или логин</div>'
            });
        }
    });
});

app.get('/show_reg', function (req, res) {
    res.render("user/after_reg", {
        title:apptitle,

    });
});

// add new page version 2 // when changed, server needs to be restarted.
app.get('/about', function (req, res) {
    res.render("user/about", {
        title:apptitle,

    });
});

// add new page version 2 this one for faq // when changed, server needs to be restarted.
app.get('/faq', function (req, res) {
    res.render("user/faq", {
        title:apptitle,

    });
});

// add new page version 2 this one for password forgotten // when changed, server needs to be restarted.
app.get('/password', function (req, res) {
    res.render("user/password", {
        title:apptitle,

    });
});

// add new page version 2 this one for company news // when changed, server needs to be restarted.
app.get('/news', function (req, res) {
    res.render("user/news", {
        title:apptitle,

    });
});


function htmlEscape(text)
{
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function htmlEscape2(text)
{
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;');
}

app.post("/user/create", function (req, res) {
    var username = req.body.username;
    var lpw = req.body.password.length;
    var lrpw = req.body.reppassword.length;
    var password = crypto.createHash('md5').update(req.body.password).digest("hex");
    var reppassword = crypto.createHash('md5').update(req.body.reppassword).digest("hex");
    var organization  = htmlEscape2(req.body.organization);
    var inn         = htmlEscape(req.body.inn);
    var phone = htmlEscape(req.body.phone);
    var fax = htmlEscape(req.body.fax);
    var call = htmlEscape(req.body.connect);
    var adress = htmlEscape(req.body.adress);
    var fio = htmlEscape(req.body.fio);
    var dp = htmlEscape(req.body.dp);
    try{
        check(username).isEmail();
        check(password).notEmpty();
        check(reppassword).notEmpty();
        check(organization).notEmpty().is(/^[a-zA-Z ]+$/);
        check(inn).notEmpty().isInt();
        check(phone).notEmpty();
        check(call).notEmpty();
        check(fax).notEmpty();
        check(dp).notEmpty();
        check(adress).notEmpty();
        check(fio).notEmpty();

              if(inn.length == 9){
               if(lpw>5 && lrpw>5){
                if(password == reppassword){
                    if(req.body.check == 'on')
                    {
                        User.find({username:req.body.username}, function (err, user) {

                            if (user.length > 0) {
                                res.render('user/registration', {
                                    title:apptitle,
                                    org:organization,
                                    adr:adress,
                                    tel:phone,
                                    fax:fax,
                                    em:username,
                                    inn:inn,
                                    fio:fio,
                                    message:'<div class="alert alert-error"> С этим емайлом уже проходили регистрацию </div>'
                                });
                            }
                             else {
                                organization = dp+' '+'"'+organization+'"';
                                var user = new User({
                                    username:username,
                                    password:password,
                                    organization:organization,
                                    inn:inn,
                                    phone:phone,
                                    call:call,
                                    fax:fax,
                                    adress:adress,
                                    fio:fio,
                                    status:"0"
                                });

                                user.save(function (err, user) {
                                    if (err) res.json(err)
                                    res.redirect('/show_reg');
                                });

                            }
                        });
                    }else{
                        res.render('user/registration', {
                            title:apptitle,
                            org:organization,
                            adr:adress,
                            tel:phone,
                            fax:fax,
                            em:username,
                            inn:inn,
                            fio:fio,
                            message:'<div class="alert alert-error">Проверьте правильность заполнения поля</div>'
                        });
                    }
                }else{
                    res.render('user/registration', {
                        title:apptitle,
                        org:organization,
                        adr:adress,
                        tel:phone,
                        fax:fax,
                        em:username,
                        inn:inn,
                        fio:fio,
                        message:'<div class="alert alert-error">Введённый пароль не соответсвует предидущему</div>'
                    });
                }
               }else{
                   res.render('user/registration', {
                       title:apptitle,
                       org:organization,
                       adr:adress,
                       tel:phone,
                       fax:fax,
                       em:username,
                       inn:inn,
                       fio:fio,
                       message:'<div class="alert alert-error">Вводиый пароль олжен состоять не менее чем 6 символов</div>'
                   });
               }
              }else{
                  res.render('user/registration', {
                      title:apptitle,
                      org:organization,
                      adr:adress,
                      tel:phone,
                      fax:fax,
                      em:username,
                      inn:inn,
                      fio:fio,
                      message:'<div class="alert alert-error">Ваше ИНН неправильно.Проверьте еще раз.</div>'
                  });
              }
    }catch(e){
        var msg = "";
        if(e['message'] ==  "Invalid characters"){ msg = "Название компании должно иметь латинские буквы"}else{msg="Проверьте правильность заполнения поля"}
        res.render('user/registration', {
            title:apptitle,
            org:organization,
            adr:adress,
            tel:phone,
            fax:fax,
            em:username,
            inn:inn,
            fio:fio,
            message:'<div class="alert alert-error">'+msg+'</div>'
        });

    }
});

app.get('/user/search', function (req, res) {
    var dates2 = getNowDate();
    Listcat.find({},function(er,lists){
    res.render("user/search", {
        company:"",
        listdoc:"",
        title:apptitle,
        dates:dates2,
        msg:"",
        check:"0",
        username:req.session.loggedUs,
        usercheck:req.session.loggedIn,
        catlist:lists
    });
    }   );
});

app.post('/searchprogress', function(req, res){
    var dates2 = getNowDate();
    var company = req.body.company;
    var inn     = req.body.inn;
    var typ   = req.body.types;
    var startd  = req.body.startdate;
    var endd    = req.body.enddate;

    if(company != "" || inn != "")
    {
        User.find({organization : {$regex:req.body.company},inn:{$regex:req.body.inn}}, function(err,userlist){
            if(userlist.length >0){
                if(typ!="")
                {
                    Doc.find({types : {$regex:typ},date:{ $gte: startd, $lte: endd}}).sort({ _id : -1 }).execFind(function(err, doclist){
                        Listcat.find({},function(er,lists){
                        res.render('user/search',{
                            company: userlist[0]['organization'],
                            listdoc: doclist,
                            users:userlist,
                            username:req.session.loggedUs,
                            msg:"",
                            dates:dates2,
                            check:'1',
                            usercheck:req.session.loggedIn,
                            catlist:lists

                               });
                        });
                    });
                }else{
                    Doc.find({date:{ $gte: startd, $lte: endd}}).sort({ _id : -1 }).execFind(function(err, doclist){
                        Listcat.find({},function(er,lists){
                        res.render('user/search',{
                            company: userlist[0]['organization'],
                            listdoc: doclist,
                            users:userlist,
                            username:req.session.loggedUs,
                            msg:"",
                            dates:dates2,
                            check:'1',
                            usercheck:req.session.loggedIn,
                            catlist:lists

                               });
                        });
                    });
                }
           }else{
               Listcat.find({},function(er,lists){
               res.render('user/search',{
                               company: "",
                               listdoc: "",
                               msg:"Ничего не найдено по вашему запросу",
                               username:req.session.loggedUs,
                               dates:dates2,
                               check:'0',
                               usercheck:req.session.loggedIn,
                                catlist:lists
                        });
               });
           }
        });
      }else{
        if(typ!="")
        {
            Doc.find({types:typ,date:{ $gte: startd, $lte: endd}}).sort({ _id : -1 }).execFind(function(err, doclist){
               if(doclist.length>0)
               {
                   User.find({},function(e,user){
                       Listcat.find({},function(er,lists){
                        res.render('user/search',{
                            company: "",
                            check:"1",
                            listdoc: doclist,
                            username:req.session.loggedUs,
                            msg:"",
                            dates:dates2,
                            users:user,
                            usercheck:req.session.loggedIn,
                            catlist:lists
                        });
                       });
                   });
                }else{
                   Listcat.find({},function(er,lists){
                       res.render('user/search',{
                           company: "",
                           listdoc: "",
                           msg:"Ничего не найдено по вашему запросу",
                           username:req.session.loggedUs,
                           dates:dates2,
                           check:'0',
                           usercheck:req.session.loggedIn,
                           catlist:lists
                       });
                   });
               }
         });
        }else{
            Doc.find({date:{ $gte: startd, $lte: endd}}).sort({ _id : -1 }).execFind(function(err, doclist){
               if(doclist.length>0)
               {
                   User.find({},function(e,user){
                       Listcat.find({},function(er,lists){
                        res.render('user/search',{
                            company: "",
                            check:"1",
                            listdoc: doclist,
                            username:req.session.loggedUs,
                            msg:"",
                            dates:dates2,
                            users:user,
                            usercheck:req.session.loggedIn,
                            catlist:lists
                        });
                       });
                   });
                }else{
                   Listcat.find({},function(er,lists){
                       res.render('user/search',{
                           company: "",
                           listdoc: "",
                           msg:"Ничего не найдено по вашему запросу",
                           username:req.session.loggedUs,
                           dates:dates2,
                           check:'0',
                           usercheck:req.session.loggedIn,
                           catlist:lists
                       });
                   });
               }
         });
        }

    }

});

app.get('/user/upload',check_user, function (req, res) {
        Listcat.find({},function(er,lists){
            res.render("user/doc_upload", {title:apptitle,message:"",username:req.session.loggedUs,list:lists});
        });
});

app.post('/user/docupload',check_user, function(req, res) {

      date = new Date();
      var dates =getNowDate();
      var typ = req.body.types;
      //console.log(typ);
      if(req.body.bodys.length >0)
      {
        if(req.body.check == 'on')
        {
             var doc = new Doc({
                 body:req.body.bodys,
                 types:req.body.types,
                 check:req.body.check,
                 date:dates,
                 from:req.session.loggedId,
                 t:"0"
             });

             doc.save(function (err,user) {
                 Doc.findOne({from:req.session.loggedId}).sort({_id:-1}).limit(1).execFind(function(er,us){
                     var id = us[0]['_id'];
                     res.redirect("/user/viewdoc/"+id);

                 });
             });
        }
      }else{
          var msg ="<h4 class='balert alert_warning'>Проверьте правильность заполнения поля.<span class='close_balert'></span></h4>";
          Listcat.find({},function(er,lists){
            res.render("user/doc_upload", {title:apptitle,message:msg, username:req.session.loggedUs,list:lists});
          });
      }
});

app.get('/user/viewdoc/:id?', function (req, res) {
    Doc.find({_id:req.params.id},function(err,list){
        User.find({_id:list[0]['from']},function(errs,listuser){
            res.render("user/document", {
                title:apptitle,
                viewdoc:list,
                viewdoc_base:new Buffer(list[0]['body']).toString('base64'),
                postpdf:pdfpost,
                viewuser:listuser,
                username:req.session.loggedUs,
                usercheck:req.session.loggedIn
            });
        });
    });
});

var deleteAfterUpload = function(req) {
    if(
         (req.files.myFile.type != "application/msword") && (req.files.myFile.type != "application/pdf") &&
         (req.files.myFile.type != "application/excel") && (req.files.myFile.type != "application/msexcel") &&
         (req.files.myFile.type != "application/vnd.ms-excel") && (req.files.myFile.type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document") &&
         (req.files.myFile.type != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") && (req.files.myFile.type != "pplication/octet-stream")
      ){
             fs.unlink(req.files.myFile.path, function(err) {
                 if (err) console.log(err);
             });
    }else{
        if(req.body.types[1] == "on"){
            var new_path = "";
            var new_doc  ="" ;
            var rep = 0;
            var dates =getNowDate();
                 /*
            for(var i=req.files.myFile.path.length-1; i>0;i--)
            {
                if(rep==0){
                    if(req.files.myFile.path[i] != new Buffer("XA==",'base64').toString('ascii')){
                        new_path = new_path +req.files.myFile.path[i];
                    }else{rep =  1;}
                }

            }

            for(var i=new_path.length-1; i>-1;i--)
            {
                new_doc = new_doc + new_path[i];
            }        */
            //new_doc =  req.files.myFile.path;
            var serverpass = "/tmp/" + req.files.myFile.name;
            require("fs").rename(req.files.myFile.path, __dirname + "/app" + serverpass);
            var doc = new Doc({
                href: serverpass, //new_doc,
                types:req.body.types[0],
                check:req.body.types[1],
                date:dates,
                from:req.session.loggedId,
                t:"1"
            });

            doc.save();
        }else{
            fs.unlink(req.files.myFile.path, function(err) {
                if (err) console.log(err);
                //console.log('file successfully deleted');
            });
        }
    }
};

app.post('/user/docload', check_user,function(req, res) {
    //console.log(req);
    deleteAfterUpload(req);
    res.end();
});

app.get('/user/company',function(req,res){
     res.redirect('/user/company/0');
});

app.get('/user/company/:page.:lcid?', check_user,function (req, res) {
        var page = req.params.page;
        var lcid   = req.params.lcid;
        if(page == null){ page = 0};
    if (lcid == null) {
        lcid = ""
    };
    User.find({_id:req.session.loggedId},function(er,user){
          if(user.length>0){
            var adress = user[0]["adress"];
            var company = user[0]['organization'];
             if(lcid.length>0){
                 Doc.find({from:req.session.loggedId,types:lcid}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function(er,doclist){
                  Doc.find({},function(er,lf){
                      Listcat.find({},function(er,lists){
                   res.render("user/company-page", {
                       title:apptitle,
                       message:"",
                       username:req.session.loggedUs,
                       userchecs:req.session.loggedIn,
                       doclists:doclist,
                       listcn:lf.length,
                       last:Math.floor(lf.length/ Limit),
                       limits:Limit,
                       catlist:lists,
                       pages:page,
                       comp:company,
                       adr:adress,
                       idlc:lcid
                   });
                      });
                 });
               });
             }else{
                 Doc.find({from:req.session.loggedId}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function(er,doclist){
                     Doc.find({},function(er,lf){
                         Listcat.find({},function(er,lists){
                             res.render("user/company-page", {
                                 title:apptitle,
                                 message:"",
                                 username:req.session.loggedUs,
                                 usercheck:req.session.loggedIn,
                                 doclists:doclist,
                                 listcn:lf.length,
                                 last:Math.floor(lf.length/ Limit),
                                 limits:Limit,
                                 catlist:lists,
                                 pages:page,
                                 comp:company,
                                 adr:adress,
                                 idlc:lcid
                             });
                         });
                     });
                 });
             }
          }else{
              res.redirect('/');
          }
        });
});

app.get('/user/company_other/:page.:id.:lcid?',function (req, res) {
    console.log(req.route);
    var page = req.params.page;
    var id   = req.params.id;
    var lcid = req.params.lcid;
    if(page == null){ page = 0};
    if(id == null){id = req.session.loggedId};
    if (lcid == null) {
        lcid = ""
    };

    User.find({_id:id},function(er,user){
        if(user.length>0){
            var adress = user[0]["adress"];
            var company = user[0]['organization'];
            if(lcid.length>0){
                Doc.find({from:id,types:lcid}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function(er,doclist){
                    Doc.find({},function(er,lf){
                        Listcat.find({},function(er,lists){
                            res.render("user/company-page_other", {
                                title:apptitle,
                                message:"",
                                username:req.session.loggedUs,
                                usercheck:req.session.loggedIn,
                                doclists:doclist,
                                listcn:lf.length,
                                last:Math.floor(lf.length/ Limit),
                                limits:Limit,
                                pages:page,
                                comp:company,
                                adr:adress,
                                user_id:id,
                                catlist:lists,
                                idlc:lcid
                            });
                        });
                    });
                });
            }else{
                Doc.find({from:id}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function(er,doclist){
                    Doc.find({},function(er,lf){
                        Listcat.find({},function(er,lists){
                            res.render("user/company-page_other", {
                                title:apptitle,
                                message:"",
                                username:req.session.loggedUs,
                                usercheck:req.session.loggedIn,
                                doclists:doclist,
                                listcn:lf.length,
                                last:Math.floor(lf.length/ Limit),
                                limits:Limit,
                                pages:page,
                                comp:company,
                                adr:adress,
                                user_id:id,
                                catlist:lists,
                                idlc:lcid
                            });
                        });
                    });
                });
            }
        }else{
            res.redirect('/');
        }
    });
});

app.get('/user/all_company/:page?',function (req, res) {
    var page = req.params.page;
    var dates2 = getNowDate();
    if(page == null){ page = 0};
            User.find({status:"1"}).sort({ _id : -1 }).skip(page*Limit).limit(Limit).execFind(function(er,complist){
                User.find({},function(er,lf){
                    res.render("user/all_company", {
                        title:apptitle,
                        message:"",
                        username:req.session.loggedUs,
                        usercheck:req.session.loggedIn,
                        complists:complist,
                        listcn:lf.length,
                        last:Math.floor(lf.length/ Limit),
                        limits:Limit,
                        dates:dates2 ,
                        pages:page
                    });
                });
            });
});

app.get('/logout', function (req, res) {
    req.session.loggedIn = false;
    req.session.loogedUs = "";
    req.session.loogedId = "";
    res.render('index',{
        title:apptitle,
        message:''});
});

/* ------------------------------------------------  SERVER ----------------------------------------------------------*/

app.get("*",function(req,res){
   res.render('user/404');
});

app.listen(app.get('PORT'));
console.log('List port : ' + app.get('PORT'));
