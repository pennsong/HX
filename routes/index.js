var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/HX');
var request = require('request');
var lwip = require("lwip");
var path = require("path");
var async = require("async");

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
});

router.post('/oldregist', function(req, res) {
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


router.post('/regist', function(req, res) {
    var newUser = null;

    function callback(err, result) {
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: newUser});
        }
    }

    async.waterfall([
            function(next){
                // do some stuff ...
                var collection = db.get('user');
                collection.insert(
                    {
                        userName: req.body.userName,
                        password: req.body.password,
                        nickName: req.body.nickName,
                        sex: req.body.sex
                    },
                    next
                );
            },
            function(result, next){
                newUser = result;
                collection = db.get('info');
                collection.insert(
                    {
                        userName: req.body.userName
                    },
                    next
                );
            }
        ],
        callback
    );
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
        {
            userName: req.body.userName
        }, // query
        {
            $set:
            {
                lastLocation:
                {
                    lng : Number(req.body.longt),
                    lat : Number(req.body.lat)
                },
                lastLocationTime: Date.now(),
                cid: req.body.cid
            }
        },
        {}, // options
        function(err, object) {
            if (err){
                console.warn(err.message);  // returns error if no matching object found
                res.json({ status: "Err"});
            }else{
                //console.dir(object);
            }
        });
    res.json({ status: "OK"});
});

//router.post('/getMeetList', function(req, res) {
//    async.parallel({
//            myCreate: function(callback){
//                db.get('meet').find(
//                    {
//                        creater: req.body.userName,
//                        status: {$ne:"match"}
//                    },
//                    callback
//                );
//            },
//            myReceive: function(callback){
//                db.get('meet').find(
//                    {
//                        target: req.body.userName,
//                        status: {$ne:"match"}
//                    },
//                    callback
//                );
//            },
//            myMatch: function(callback){
//                db.get('meet').find(
//                    {
//                        $or: [
//                            {creater: req.body.userName},
//                            {target: req.body.userName}
//                        ],
//                        status: "match"
//                    },
//                    callback
//                );
//            }
//        },
//        function(err, results) {
//            res.json({status: "OK", list: results});
//        });
//});

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

function createMeet(req, res){
    var meetId = null;
    var createdMeet = null;

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }

    async.waterfall([
            function(next){
                db.get('meet').insert(
                    {
                        creater: req.body.userName,
                        location: { lng: req.body.lng, lat: req.body.lat},
                        target: req.body.target,
                        status: req.body.status,
                        uid: req.body.uid,
                        targetSex: req.body.targetSex,
                        targetClothesColor: req.body.targetClothesColor,
                        targetClothesStyle: req.body.targetClothesStyle,
                        targetClothesType: req.body.targetClothesType,
                        targetGlasses: req.body.targetGlasses,
                        targetHair: req.body.targetHair
                    },
                    next
                );
            },
            function(result, next){
                createdMeet = result;
                if (req.body.target && req.body.target != "fake")
                {
                    meetId = result._id;
                    db.get('info').findOne(
                        {
                            userName: req.body.target
                        },
                        next
                    );
                }
                else
                {
                    finalCallback(null, createdMeet);
                }
            },
            function(result, next){
                console.log(result.cid);
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    {
                        form:
                        {
                            pushtype: 'tran',
                            version: '0.13.0',
                            appid: 'HBuilder',
                            cid: result.cid,
                            title: 'Hello H5 ',
                            content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                            payload: '"type":"invite", "meetId":"'+ meetId + '"'
                        }
                    },
                    function(err, res, body)
                    {
                        next(err, createdMeet);
                    }
                );
            }
        ],
        finalCallback
    );
}

router.post('/createMeet', function(req, res) {
    createMeet(req, res);
});

router.post('/updateMeet', function(req, res) {
    var meetId = null;
    var updatedMeet = null;

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }

    async.waterfall([
            function(next){
                db.get('meet').findAndModify(
                    {
                        _id: req.body.meetId
                    }, // query
                    {
                        $set: {
                            target: req.body.userName,
                            status: "待回复"
                        }
                    },
                    {
                        new: true
                    },
                    next
                );
            },
            function(result, next){
                createdMeet = result;
                meetId = result._id;
                db.get('info').findOne(
                    {
                        userName: result.target
                    },
                    next
                );
            },
            function(result, next){
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    {
                        form:
                        {
                            pushtype: 'tran',
                            version: '0.13.0',
                            appid: 'HBuilder',
                            cid: result.cid,
                            title: 'Hello H5 ',
                            content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                            payload: '"type":"invite", "meetId":"'+ meetId + '"'
                        }
                    },
                    function(err, res, body)
                    {
                        next(err, createdMeet);
                    }
                );
            }
        ],
        finalCallback
    );
});

router.post('/replyMeet', function(req, res) {
    var meetId = null;
    var matchedMeet = null;

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }

    async.waterfall([
            function(next){
                db.get('meet').findOne(
                    {
                        _id: req.body.meetId
                    },
                    next
                );
            },
            function(result, next){
                //匹配成功
                if (result.creater == req.body.target)
                {
                    db.get('meet').findAndModify(
                        {_id: req.body.meetId}, // query
                        {$set: {status: "成功"}},
                        {new: true},
                        next
                    );
                }
                //没有匹配
                else
                {
                    finalCallback(null, null);
                }
            },
            function(result, next){
                meetId = result._id;
                matchedMeet = result;
                db.get('info').findOne(
                    {
                        userName: result.target
                    },
                    next
                );
            },
            function(result, next){
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
                    function(err, res, body)
                    {
                        next(err, null);
                    }
                );
            },
            function(result, next){
                db.get('info').findOne(
                    {
                        userName: matchedMeet.creater
                    },
                    next

                );
            },
            function(result, next){
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    {
                        form:
                        {
                            pushtype: 'tran',
                            version: '0.13.0',
                            appid: 'HBuilder',
                            cid: result.cid,
                            title: 'Hello H5 ',
                            content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                            payload: '"type":"matchCreater", "meetId":"'+ meetId + '"'
                        }
                    },
                    function(err, res, body)
                    {
                        next(err, matchedMeet);
                    }
                );
            }
        ],
        finalCallback
    );
});

router.post('/getMeet', function(req, res){
    var meetId = null;
    var meet = null;

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }
    async.waterfall([
            function(next){
                db.get('meet').findOne(
                    {
                        _id: req.body.meetId
                    },
                    next
                );
            },
            function(result, next){
                meet = result;
                if (meet.target == "")
                {
                    finalCallback(null, meet);
                }
                else
                {
                    next(null, meet);
                }
            },
            function(result, next){
                db.get('info').findOne(
                    {
                        userName: meet.target
                    },
                    next
                );
            },
            function(result, next){
                db.get('info').findOne(
                    {
                        userName: meet.target
                    },
                    next
                );
            },
            function(result, next){
                meet.targetFileName = result.fileName;
                next(null, meet);
            }
        ],
        finalCallback
    );
});

router.post('/getInfo', function(req, res) {
    var now = new Date();
    var currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

router.post('/updateInfo', function(req, res){

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }
    async.waterfall([
            function(next){
                db.get('user').findOne(
                    {
                        userName: req.body.userName
                    },
                    next
                );
            },
            function(result, next){
                db.get('info').findAndModify(
                    {userName: req.body.userName},
                    {$set:
                    {
                        sex: result.sex,
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
                    },
                    next
                );
            }
        ],
        finalCallback
    );
});

router.post('/uploadSpecialPic', function(req, res) {
    if (req.body.client == "pp")
    {
        var fileName = req.files.specialPic.name;
        var fileNameBase = path.basename(fileName, path.extname(fileName));

        async.parallel([
                function(callback){
                    lwip.open('./public/images/'+fileName,
                        function(err, image){
                            image.batch().resize(80, 80).writeFile('./public/images/' + fileNameBase + "_m.jpg",
                                function(err){
                                    callback(err, 'ok');
                                }
                            );
                        }
                    );
                },
                function(callback){
                    lwip.open('./public/images/'+fileName,
                        function(err, image){
                            image.batch().resize(40, 40).writeFile('./public/images/' + fileNameBase + "_s.jpg",
                                function(err){
                                    callback(err, 'ok');
                                }
                            );
                        }
                    );
                },
                function(callback){
                    lwip.open('./public/images/'+fileName,
                        function(err, image){
                            image.batch().scale(0.25).resize(200, 200).writeFile('./public/images/' + fileNameBase + "_l.jpg",
                                function(err){
                                    callback(err, 'ok');
                                }
                            );
                        }
                    );
                }
            ],
            function(err, results){
                if (err)
                {
                    res.json({status:"Err", msg:err});
                }
                else{
                    res.json({status: "OK", item: fileName});
                }
            }
        );
    }
    else
    {
        res.end("server");
    }
});

router.post('/searchTargetPic', function(req, res){
    var realResult = null;
    var before15Min = new Date(new Date().getTime() - 15*60000);

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }
    async.waterfall([
            function(next){
                db.get('info').find(
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
                    next
                );
            },
            function(result, next){
                realResult = result;
                //随机图片
                var needRanNum = 4 - result.length;
                if (needRanNum > 0)
                {
                    //已有图片
                    var existPics = result.map(function(info) {
                        return info.fileName;
                    });

                    db.get('info').find(
                        {
                            fileName: {
                                $exists: true, $nin: existPics,
                                $ne: ""
                            },
                            userName:{$ne: req.body.userName}
                        },
                        {limit: needRanNum},
                        next
                    );
                }
                else{
                    finalCallback(null, realResult);
                }
            },
            function(result, next)
            {
                var fakeResult = result.map(function(info){
                    return {userName: "fake", fileName: info.fileName};
                });
                next(null, realResult.concat(fakeResult));
            }
        ],
        finalCallback
    );
});

router.post('/checkLocUid', function(req, res){
    db.get('meet').findOne(
        {
            _id: req.body.meetId
        },
        function(err, result)
        {
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                if (result.uid == req.body.uid)
                {
                    res.json({status: "OK", match: "YES"});
                }
                else
                {
                    res.json({status: "OK", match: "NO"});
                }
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
                //console.log(result);
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
    var chat = null;

    function finalCallback(err, result){
        if (err){
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }
    async.waterfall([
            function(next){
                db.get('meet').findOne(
                    {
                        _id: meetId
                    },
                    next
                );
            },
            function(result, next)
            {
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
                    next
                );
            },
            function(result, next){
                chat = result;
                db.get('info').findOne(
                    {
                        userName: to
                    },
                    next
                );
            },
            function(result, next){
                var cid = result.cid;
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    {
                        form:
                        {
                            pushtype: 'tran',
                            version: '0.13.0',
                            appid: 'HBuilder',
                            cid: cid,
                            title: 'Hello H5 ',
                            content: '带透传数据推送通知，可通过plus.push API获取数据并进行业务逻辑处理！',
                            payload: '"type":"chat", "content":"'+ content + '", "meetId":"'+ meetId + '"'
                        }
                    },
                    function(err, res, body)
                    {
                        next(err, chat);
                    }
                );
            }
        ],
        finalCallback
    );
});

router.post('/oldchat', function(req, res) {
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
