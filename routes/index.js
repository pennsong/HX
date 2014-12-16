var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/HX');
var request = require('request');
var lwip = require("lwip");
var path = require("path");

/* GET home page. */
router.get('/', function(req, res) {
    var collection = db.get('places');
    collection.find(
        {
            loc:{
                $near:{
                    $geometry:{
                        type:"Point",
                        coordinates:[-5.9382, 23.222]
                    },
                    $maxDistance: 200000
                }
            }
        },
        function(e,docs){
            console.log(docs);
            //res.writeHead(200, {'Content-Type': 'text/plain'});
            //res.end('Hello World!');
            res.render('index', { title: 'Express' });
        }
    );
});

router.post('/', function(req, res) {
    //console.log(req);
    res.end('Hello World!' + req.body.hair);
});

router.post('/regist', function(req, res) {
    var collection = db.get('user');
    collection.insert(
        {
            userName: req.body.userName,
            password: req.body.password,
            nickName: req.body.nickName,
            sex: req.body.sex
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err, bug:result});
            }
            else{
                var newUser = result;
                collection = db.get('info');
                collection.insert(
                    {
                        userName: req.body.userName
                    },
                    function(err, result){
                        if (err){
                            res.json({status:"Err", msg:err, bug:result});
                        }
                        else{
                            res.json({status: "OK", item: newUser});
                        }
                    }
                );
            }
        }
    );
});

router.get('/test', function(req, res) {
    res.json({ msgId: "abc" });
});

router.post('/login', function(req, res) {
    console.log(req.body.userName + "," + req.body.password);
    var collection = db.get('user');
    collection.find(
        {
            userName: req.body.userName,
            password: req.body.password
        },
        function(e,docs){
            if (docs.length == 1)
            {
                res.json({status: "OK", userName: docs[0].userName, nickName: docs[0].nickName});
            }
            else
            {
                res.json({status: "Err", msg:"用户名或密码错误"});
            }
        }
    );
});

router.post('/updateLocation', function(req, res) {
    var collection = db.get('info');
    collection.findAndModify(
        {userName: req.body.userName}, // query
        {$set: {lastLocation: { lng : Number(req.body.longt) , lat : Number(req.body.lat)}, lastLocationTime: Date.now(), cid: req.body.cid}}, // replacement, replaces only the field "hi"
        {}, // options
        function(err, object) {
            if (err){
                console.warn(err.message);  // returns error if no matching object found
            }else{
                //console.dir(object);
            }
        });
    res.json({ msgId: "abc" });
});

router.get('/profile', function(req, res) {
    res.json({status: "OK"});
});

router.post('/getMeetList', function(req, res) {
    var collection = db.get('meet');
    var myCreate = [];
    var myReceive = [];
    var myMatch = [];
    collection.find(
        {
            creater: req.body.userName,
            status: {$ne:"match"}
        },
        function(e,docs){
            myCreate = docs;
            collection.find(
                {
                    target: req.body.userName,
                    status: {$ne:"match"}
                },
                function(e,docs){
                    myReceive = docs;
                    collection.find(
                        {
                            $or: [
                                {creater: req.body.userName},
                                {target: req.body.userName}
                            ],
                            status: "match"
                        },
                        function(e,docs){
                            myMatch = docs;
                            var list = {
                                "myCreate": myCreate,
                                "myReceive": myReceive,
                                "myMatch": myMatch
                            };
                            //console.log(list);
                            res.json({status: "OK", list: list});
                        }
                    );
                }
            );
        }
    );
});

router.post('/getMyMeetList', function(req, res) {
    var collection = db.get('meet');
    collection.find(
        {
            $or: [
                {creater: req.body.userName},
                {target: req.body.userName}
            ],
            status: {$ne:"成功"}
        },
        {
            sort: {_id: -1}
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                //console.log(result);
                res.json({status: "OK", list: result});
            }
        }
    );

});

router.post('/getSuccessList', function(req, res) {
    var collection = db.get('meet');
    collection.find(
        {
            $or: [
                {creater: req.body.userName},
                {target: req.body.userName}
            ],
            status: {$eq:"成功"}
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                console.log(result);
                res.json({status: "OK", list: result});
            }
        }
    );

});

router.post('/createMeet', function(req, res) {
    console.log(req);
    var collection = db.get('meet');
    collection.insert(
        {
            creater: req.body.userName,
            location: { lng: req.body.lng, lat: req.body.lat},
            target: req.body.target,
            status: req.body.status,
            targetSex: req.body.targetSex,
            targetClothesColor: req.body.targetClothesColor,
            targetClothesStyle: req.body.targetClothesStyle,
            targetClothesType: req.body.targetClothesType,
            targetGlasses: req.body.targetGlasses,
            targetHair: req.body.targetHair
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                if (req.body.target && req.body.target != "fake")
                {
                    //通知被选择方
                    //get cid
                    var meetId = result._id;
                    db.get('info').findOne(
                        {
                            userName: req.body.target
                        },
                        function(err, result){
                            if (err){
                                res.json({status:"Err", msg:err});
                            }
                            else{
                                request.post(
                                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                    { form:
                                    { pushtype: 'tran',
                                        version: '0.13.0',
                                        appid: 'HBuilder',
                                        cid: result.cid,
                                        title: 'Hello H5 ',
                                        content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                                        payload: '"type":"invite", "meetId":"'+ meetId + '"'
                                    }
                                    },
                                    function (error, response, body) {
                                        if (!error && response.statusCode == 200) {
                                            //res.json({status: "OK", item: null});
                                        }
                                        else
                                        {
                                            res.json({status:"Err", msg:err});
                                        }
                                    }
                                );

                            }
                        }
                    );

                    res.json({status: "OK", item: result});
                }
                else
                {
                    res.json({status: "OK", item: result});
                }


            }
        }
    );
});

router.post('/updateMeet', function(req, res) {
    console.log(req.body.meetId + "," + req.body.userName)
    var collection = db.get('meet');
    collection.findAndModify(
        {_id: req.body.meetId}, // query
        {$set: {target: req.body.userName, status: "待回复"}}, // replacement, replaces only the field "hi"
        {new: true}, // options
        function(err, result) {
            //console.log(result);
            if (err){
                console.log(err);
                console.warn(err.message);  // returns error if no matching object found
            }else{
                var meetId = result._id;
                db.get('info').findOne(
                    {
                        userName: result.target
                    },
                    function(err, result){
                        if (err){
                            res.json({status:"Err", msg:err});
                        }
                        else{
                            request.post(
                                'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                { form:
                                { pushtype: 'tran',
                                    version: '0.13.0',
                                    appid: 'HBuilder',
                                    cid: result.cid,
                                    title: 'Hello H5 ',
                                    content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                                    payload: '"type":"invite", "meetId":"'+ meetId + '"'
                                }
                                },
                                function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        //res.json({status: "OK", item: null});
                                    }
                                    else
                                    {
                                        res.json({status:"Err", msg:err});
                                    }
                                }
                            );

                        }
                    }
                );

                res.json({status: "OK", item: result});
            }
        }
    );
});

router.post('/replyMeet', function(req, res) {
    console.log(req.body.meetId + "," + req.body.userName)
    var collection = db.get('meet');
    collection.findOne(
        {
            _id: req.body.meetId
        },
        function(err, result)
        {
            if (err){
                res.json({status:"Err", msg:err});
            }
            else
            {
                if (result.creater == req.body.userName)
                {
                    //配对成功
                    db.get('meet').findAndModify(
                        {_id: req.body.meetId}, // query
                        {$set: {status: "成功"}},
                        {new: true}, // options
                        function(err, result) {
                            if (err){
                                console.log(err);
                                res.json({status:"Err", msg:err});
                            }else{
                                //console.log(result);
                                var meetId = result._id;
                                db.get('info').findOne(
                                    {
                                        userName: result.target
                                    },
                                    function(err, result){
                                        if (err){
                                            res.json({status:"Err", msg:err});
                                        }
                                        else{
                                            request.post(
                                                'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                                { form:
                                                { pushtype: 'tran',
                                                    version: '0.13.0',
                                                    appid: 'HBuilder',
                                                    cid: result.cid,
                                                    title: 'Hello H5 ',
                                                    content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                                                    payload: '"type":"matchTarget", "meetId":"'+ meetId + '"'
                                                }
                                                },
                                                function (error, response, body) {
                                                    if (!error && response.statusCode == 200) {
                                                        //res.json({status: "OK", item: null});
                                                    }
                                                    else
                                                    {
                                                        res.json({status:"Err", msg:err});
                                                    }
                                                }
                                            );

                                        }
                                    }
                                );
                                db.get('info').findOne(
                                    {
                                        userName: result.creater
                                    },
                                    function(err, result){
                                        if (err){
                                            res.json({status:"Err", msg:err});
                                        }
                                        else{
                                            request.post(
                                                'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                                { form:
                                                { pushtype: 'tran',
                                                    version: '0.13.0',
                                                    appid: 'HBuilder',
                                                    cid: result.cid,
                                                    title: 'Hello H5 ',
                                                    content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                                                    payload: '"type":"matchCreater", "meetId":"'+ meetId + '"'
                                                }
                                                },
                                                function (error, response, body) {
                                                    if (!error && response.statusCode == 200) {
                                                        //res.json({status: "OK", item: null});
                                                    }
                                                    else
                                                    {
                                                        res.json({status:"Err", msg:err});
                                                    }
                                                }
                                            );

                                        }
                                    }
                                );
                                res.json({status: "OK", item: result});
                            }
                        }
                    );
                }
                else
                {
                    res.json({status: "OK", item: null});
                }

            }
        }


    );
});

router.post('/getMeet', function(req, res) {
    var collection = db.get('meet');
    collection.find(
        {
            _id: req.body.meetId
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else if (result.length == 0)
            {
                res.json({status:"Err", msg:{err:"不存在此记录"}});
            }
            else{
                var meet = result[0];
                if (meet.target == "")
                {
                    console.log(meet);
                    res.json({status: "OK", item: meet});
                }
                else
                {
                    db.get('info').findOne(
                        {
                            userName: meet.target
                        },
                        function(err, result){
                            if (err){
                                res.json({status:"Err", msg:err});
                            }
                            else{
                                console.log(result);
                                meet.targetFileName = result.fileName;
                                res.json({status: "OK", item: meet});
                            }
                        }
                    );
                }
            }
        }
    );
});

router.post('/getInfo', function(req, res) {
    var now = new Date();
    var currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log(currentDate);
    var collection = db.get('info');
    collection.find(
        {
            userName: req.body.userName,
            updateTime: {$gt:currentDate}
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                console.log();
                res.json({status: "OK", item: result[0]});
            }
        }
    );
});

router.post('/updateInfo', function(req, res) {
    var sex = "";
    db.get('user').findOne(
        {
            userName: req.body.userName
        },
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                sex = result.sex;
                var collection = db.get('info');
                collection.findAndModify(
                    {userName: req.body.userName}, // query
                    {$set:
                    {
                        sex: sex,
                        hair: req.body.hair,
                        glasses: req.body.glasses,
                        clothesType: req.body.clothesType,
                        clothesColor: req.body.clothesColor,
                        clothesStyle: req.body.clothesStyle,
                        fileName: req.body.fileName,
                        updateTime: new Date()
                    }
                    },
                    {
                        new: true
                    }, // options
                    function(err, object) {
                        if (err){
                            console.warn(err.message);  // returns error if no matching object found
                        }else{
                            console.log(object);
                            res.json({status: "OK", item: object});
                        }
                    }
                );
            }
        }
    );
});

router.post('/uploadSpecialPic', function(req, res) {
    if (req.body.client == "pp")
    {
        var fileName = req.files.specialPic.name;
        var fileNameBase = path.basename(fileName, path.extname(fileName));
        lwip.open('./public/images/'+fileName, function(err, image){
            image.batch().resize(80, 80).writeFile('./public/images/' + fileNameBase + "_m.jpg", function(err){
            });
        });
        lwip.open('./public/images/'+fileName, function(err, image){
            image.batch().resize(40, 40).writeFile('./public/images/' + fileNameBase + "_s.jpg", function(err){
            });
        });
        lwip.open('./public/images/'+fileName, function(err, image){
            image.batch().scale(0.25).resize(200, 200).writeFile('./public/images/' + fileNameBase + "_l.jpg", function(err){
            });
        });
        res.json({status: "OK", item: fileName});
    }
    else
    {
        res.end("server");
    }
});

router.post('/searchTargetPic', function(req, res) {
    var before15Min = new Date(new Date().getTime() - 15*60000);
    var collection = db.get('info');
    collection.find(
        {
            lastLocation:{
                $near :
                {
                    $geometry: { type: "Point",  coordinates: [ Number(req.body.lng), Number(req.body.lat) ] },
                    $maxDistance: 500
                }
            },
            lastLocationTime: {$gt:before15Min.getTime()},
            userName:{$ne: req.body.userName},
            sex: req.body.sex,
            hair: req.body.hair,
            glasses: req.body.glasses,
            clothesType: req.body.clothesType,
            clothesColor: req.body.clothesColor,
            clothesStyle: req.body.clothesStyle
        },
        function(err, result){
            if (err){
                console.log(err);
                res.json({status:"Err", msg:err});
            }
            else{
                //console.log(result);
                //随机图片
                var needRanNum = 4 - result.length;
                if (needRanNum > 0)
                {
                    //已有图片
                    var existPics = result.map(function(info) {
                        return info.fineName;
                    });

                    db.get('info').find( { fileName: { $exists: true, $nin: existPics, $ne: "" } }, {limit: 4}, function(err, result2){
                        if (err){
                            res.json({status:"Err", msg:err});
                        }else{
                            var fakeResult = result2.map(function(info){
                                return {userName: "fake", fileName: info.fileName};
                            });
                            res.json({status: "OK", item: result.concat(fakeResult)});
                        }
                    });
                }
                else{
                    res.json({status: "OK", item: result});
                }


            }
        }
    )
});

router.get('/tt', function(req, res) {
    request.post(
        'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
        { form:
        { pushtype: 'tran',
            version: '0.13.0',
            appid: 'HBuilder',
            cid: '1d511858b3bfac8e35a500dc3a59c6f9',
            title: 'Hello H5 ',
            content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
            payload: '"type":"test"'
        }
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
        }
    );
});

router.post('/getChatList', function(req, res) {
    db.get('chat').find(
        {
            meetId: req.body.meetId
        },
        {
            sort: {_id: -1}
        },
        function(err, result)
        {
            if (err){
                console.log(err);
                res.json({status:"Err", msg:err});
            }
            else{
                console.log(result);
                res.json({status: "OK", list: result});
            }
        }
    );
});

router.post('/chat', function(req, res) {
    var meetId = req.body.meetId;
    var content = req.body.content;
    var from = req.body.userName;
    var to = "";

    console.log(meetId + "," + content + ',' + from);
    db.get('meet').findOne(
        {
            _id: meetId
        },
        function(err, result){
            if (err){
                console.log(err);
                res.json({status:"Err", msg:err});
            }
            else{
                var creater = result.creater;
                var target = result.target;

                if (from == creater)
                {
                    to = target;
                }
                else
                {
                    to = creater;
                }
                db.get('chat').insert(
                    {
                        meetId: meetId,
                        from: from,
                        to: to,
                        content: content
                    },
                    function(err, result){
                        if (err){
                            res.json({status:"Err", msg:err});
                        }
                        else
                        {
                            db.get('info').findOne(
                                {
                                    userName: to
                                },
                                function(err, result)
                                {
                                    if (err)
                                    {
                                        res.json({status:"Err", msg:err});
                                    }
                                    else
                                    {
                                        var cid = result.cid;
                                        request.post(
                                            'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                            { form:
                                            { pushtype: 'tran',
                                                version: '0.13.0',
                                                appid: 'HBuilder',
                                                cid: cid,
                                                title: 'Hello H5 ',
                                                content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                                                payload: '"type":"chat", "content":"'+ content + '", "meetId":"'+ meetId + '"'
                                            }
                                            },
                                            function (error, response, body) {
                                                if (!error && response.statusCode == 200) {
                                                    //res.json({status: "OK", item: null});
                                                }
                                                else
                                                {
                                                    //res.json({status:"Err", msg:err});
                                                }
                                            }

                                        );
                                    }
                                }
                            );
                            res.json({status: "OK", item: result});
                        }
                    }
                );
            }
        }
    );
});

module.exports = router;
