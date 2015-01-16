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
    if (req.body.userName == "fake")
    {
        res.json({status:"Err", msg:err});
        return;
    }

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
                        userName: req.body.userName,
                        sex: req.body.sex
                    },
                    next
                );
            }
        ],
        callback
    );
});

router.post('/login', function(req, res) {
    console.log(req.body.userName + "," + req.body.password + "," + req.body.cid);
    var collection = db.get('user');
    collection.find(
        {
            userName: req.body.userName,
            password: req.body.password
        },
        function(e,docs){
            if (docs.length == 1)
            {
                //清空同台设备绑定的其他用户
                db.get('info').findAndModify(
                    {
                        cid: {$eq: req.body.cid},
                        userName: {$ne: req.body.userName}
                    },
                    {
                        $set:
                        {
                            cid: null
                        }
                    },
                    {},
                    function(err, result)
                    {
                        console.log(result);
                        if (err){
                            res.json({status:"Err", msg:err});
                        }
                        else{
                            res.json({status: "OK", userName: docs[0].userName, nickName: docs[0].nickName});
                        }
                    }
                );
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

router.post('/checkFriendExist', function(req, res) {
    db.get('meet').find(
        {
            $or: [
                {creater: req.body.userName, target: req.body.friendUserName},
                {creater: req.body.friendUserName, target: req.body.userName}
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
        {
            sort: {_id: -1}
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
    var now = new Date();
    var before15Min = new Date(now.getTime() - 15*60000);
    var currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
                        location: { lng: Number(req.body.lng), lat: Number(req.body.lat)},
                        target: req.body.target,
                        status: req.body.status,
                        locName: req.body.locName,
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

                if (req.body.target == "fake")
                {
                    finalCallback(null, createdMeet);
                }
                else if (req.body.target)
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
                    //发送给附近没有更新info的人
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
                            $or: [
                                {updateTime: null}, {updateTime: {$lte:currentDate}}
                            ]
                        },
                        function(err, result)
                        {
                            console.log(result);
                            if (err)
                            {
                            }
                            else
                            {
                                result.forEach(function(item){
                                    request.post(
                                        'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                        {
                                            form:
                                            {
                                                pushtype: 'tran',
                                                version: '0.13.0',
                                                appid: 'HBuilder',
                                                cid: item.cid,
                                                title: 'Info need to update',
                                                content: '机会来啦,请更新个人信息啊!',
                                                payload: '"type":"checkInfo", "a":"'+ 1 + '"'
                                            }
                                        },
                                        function(err, res, body)
                                        {

                                        }
                                    );
                                });
                            }
                        }
                    );


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

router.post('/delContract', function(req, res) {
    var meetId = req.body.meetId;
    var createrUserName = null;
    var targetUserName = null;

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
            function(result, next){
                createrUserName = result.creater;
                targetUserName = result.target;
                db.get('info').findOne(
                    {
                        userName: createrUserName
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
                            payload: '"type":"delContract", "friendUserName":"'+ targetUserName + '"'
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
                        userName: targetUserName
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
                            payload: '"type":"delContract", "friendUserName":"'+ createrUserName + '"'
                        }
                    },
                    function(err, res, body)
                    {
                        next(err, null);
                    }
                );
            },
            function(result, next){
                db.get('meet').remove(
                    {
                        _id: meetId
                    },
                    next
                );
            }
        ],
        finalCallback
    );
});

router.post('/replyMeet', function(req, res) {
    var meetId = null;
    var matchedMeet = null;
    var createrInfo = null;
    var targetInfo = null;

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
                        userName: matchedMeet.target
                    },
                    next
                );
            },
            function(result, next){
                targetInfo = result;
                db.get('info').findOne(
                    {
                        userName: matchedMeet.creater
                    },
                    next

                );
            },
            function(result, next){
                createrInfo = result;
                db.get('meet').findAndModify(
                    {_id: req.body.meetId}, // query
                    {$set: {targetPic: targetInfo.fileName, createrPic: createrInfo.fileName}},
                    {new: true},
                    next
                );
            },
            function(result, next){
                console.log('"type":"matchTarget", "friendUserName":"'+ matchedMeet.creater + '"');
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    { form:
                    { pushtype: 'tran',
                        version: '0.13.0',
                        appid: 'HBuilder',
                        cid: targetInfo.cid,
                        title: 'Hello H5 ',
                        content: 'tt',
                        payload: '"type":"matchTarget", "pic":"'+ createrInfo.fileName + '", "friend":"'+ matchedMeet.creater + '", "meetId":"'+ matchedMeet._id + '"'
                    }
                    },
                    function(err, res, body)
                    {
                        next(err, null);
                    }
                );
            },
            function(result, next){
                console.log('"type":"matchCreater", "friendUserName":"'+ matchedMeet.target + '", "meetId":"'+ matchedMeet._id + '"');
                request.post(
                    'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                    {
                        form:
                        {
                            pushtype: 'tran',
                            version: '0.13.0',
                            appid: 'HBuilder',
                            cid: createrInfo.cid,
                            title: 'Hello H5 ',
                            content: 'tt',
                            payload: '"type":"matchCreater", "pic":"'+ targetInfo.fileName + '", "friend":"'+ matchedMeet.target + '", "meetId":"'+ matchedMeet._id + '"'
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
                if (meet.target == "" || meet.target == "fake")
                {
                    console.log(meet);
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

router.post('/sendMeetCheck', function(req, res) {
    var now = new Date();
    var before30Min = new Date(now.getTime() - 30*60000);
    var currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    db.get('meet').find(
        {
            creater: req.body.userName
        },
        {
            limit : 1,
            sort:
            {
                _id: -1
            }
        },
        function(err, result)
        {
            if (err){
                console.log(err);
                res.json({status:"Err", msg:err});
            }
            else
            {
//                if (result.length == 1)
//                {
//                    var diffSec = new Date(parseInt(result[0]._id.toString().slice(0,8), 16)*1000) - before30Min;
//
//                    if (diffSec > 0)
//                    {
//                        res.json({status: "OK", warn: Math.floor(diffSec / 1000 / 60)});
//                        return;
//                    }
//                }

                db.get('info').find(
                    {
                        userName: req.body.userName,
                        updateTime: {$gt:currentDate}
                    },
                    function(err, result){
                        if (err){
                            console.log(err);
                            res.json({status:"Err", msg:err});
                        }
                        else{
                            //console.log(result[0]);
                            //检查是否可以发送邀请
                            res.json({status: "OK", item: result[0]});
                        }
                    }
                );
            }
        }
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
                console.log(result[0]);
                res.json({status: "OK", item: result[0]});
            }
        }
    );
});


function objectIdWithTimestamp(timestamp)
{
    // Convert string date to Date object (otherwise assume timestamp is a date)
    if (typeof(timestamp) == 'string') {
        timestamp = new Date(timestamp);
    }

    // Convert date object to hex seconds since Unix epoch
    var hexSeconds = Math.floor(timestamp/1000).toString(16);

    // Create an ObjectId with that hex timestamp
    var constructedObjectId = db.get('info').id(hexSeconds + "0000000000000000");

    return constructedObjectId
}

router.post('/updateInfo', function(req, res){
    var newInfo = null;
    db.get('info').findAndModify(
        {userName: req.body.userName},
        {
            $set:
            {
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
        function(err, result){
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                newInfo = result;
                console.log(newInfo.sex);
                res.json({status: "OK", item: result});

                //寻找附近待确定符合条件的meet, 通知对方
                var now = new Date();
                var before30Min = new Date(now.getTime() - 30*60000);
                db.get('meet').col.aggregate(
                    [
                        {
                            $geoNear: {
                                near: { type: "Point", coordinates: [ newInfo.lastLocation.lng, newInfo.lastLocation.lat ] },
                                distanceField: "location",
                                maxDistance: 500,
                                query: {
                                    _id: { $gt: objectIdWithTimestamp(before30Min) },
                                    creater:{$ne: req.body.userName},
                                    targetSex:newInfo.sex,
                                    status: "待确认"
                                },
                                //includeLocs: "dist.location",
                                //num: 100,
                                spherical: true
                            }
                        },
                        {
                            $project: {
                                finalTotal: {
                                    $let: {
                                        vars: {
                                            vhair: { $cond: { if: {$eq: ['$targetHair', newInfo.hair]}, then: 1, else: 0 } },
                                            vglasses: { $cond: { if: {$eq: ['$targetGlasses', newInfo.glasses]}, then: 1, else: 0 } },
                                            vclothesType: { $cond: { if: {$eq: ['$targetClothesType', newInfo.clothesType]}, then: 1, else: 0 } },
                                            vclothesColor: { $cond: { if: {$eq: ['$targetClothesColor', newInfo.clothesColor]}, then: 1, else: 0 } },
                                            vclothesStyle: { $cond: { if: {$eq: ['$targetClothesStyle', newInfo.clothesStyle]}, then: 1, else: 0 } }
                                        },
                                        in: { $add: [ "$$vhair", "$$vglasses", "$$vclothesType", "$$vclothesColor", "$$vclothesStyle" ] }
                                    }
                                },
                                creater: 1,
                                _id: 1
                            }
                        },
                        {
                            $match :
                            {
                                finalTotal: {$gte: 4}
                            }
                        },
                        {
                            $sort:
                            {
                                finalTotal: -1
                            }
                        }
                    ],
                    function(err, result){
                        console.log('aa');
                        console.log(result);
                        if (err){
                            console.log(err);
                        }
                        else{
                            var userNames = result.map(function(item){
                                return item.creater;
                            });
                            db.get('info').find(
                                {
                                    userName: { $in: userNames }
                                },
                                function(err, result2){
                                    var userNameCid = [];

                                    result2.forEach(function(item){
                                        userNameCid['_' + item.userName] = item.cid;
                                    });
                                    result.forEach(function(item){
                                        item.cid = userNameCid['_' + item.creater];
                                        request.post(
                                            'http://demo.dcloud.net.cn/helloh5/push/igetui.php',
                                            {
                                                form:
                                                {
                                                    pushtype: 'tran',
                                                    version: '0.13.0',
                                                    appid: 'HBuilder',
                                                    cid: item.cid,
                                                    title: 'Hello H5 ',
                                                    content: 'tt！',
                                                    payload: '"type":"checkNewXiehouPic", "meetId":"'+ item._id + '"'
                                                }
                                            },
                                            function(err, res, body)
                                            {

                                                if (err)
                                                {
                                                    console.log(err);
                                                }
                                                else
                                                {
                                                    console.log(item.cid);
                                                }
                                            }
                                        );

                                    });
                                }
                            );
                        }
                    }
                );
            }
        }
    );


});

router.post('/uploadSpecialPic', function(req, res) {
    console.log(req);
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

});

router.post('/matchMeet', function(req, res){
    db.get('meet').col.aggregate(
        [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [ Number(req.body.lng), Number(req.body.lat) ] },
                    distanceField: "location",
                    maxDistance: 500,
                    query: {
                        _id: db.get('meet').id(req.body.meetId),
                        targetSex: req.body.sex
                    },
                    //includeLocs: "dist.location",
                    //num: 100,
                    spherical: true
                }
            },
            {
                $project: {
                    finalTotal: {
                        $let: {
                            vars: {
                                vhair: { $cond: { if: {$eq: ['$targetHair', req.body.hair]}, then: 1, else: 0 } },
                                vglasses: { $cond: { if: {$eq: ['$targetGlasses', req.body.glasses]}, then: 1, else: 0 } },
                                vclothesType: { $cond: { if: {$eq: ['$targetClothesType', req.body.clothesType]}, then: 1, else: 0 } },
                                vclothesColor: { $cond: { if: {$eq: ['$targetClothesColor', req.body.clothesColor]}, then: 1, else: 0 } },
                                vclothesStyle: { $cond: { if: {$eq: ['$targetClothesStyle', req.body.clothesStyle]}, then: 1, else: 0 } }
                            },
                            in: { $add: [ "$$vhair", "$$vglasses", "$$vclothesType", "$$vclothesColor", "$$vclothesStyle" ] }
                        }
                    }
                }
            },
            {
                $match :
                {
                    finalTotal: {$gte: 4}
                }
            },
            {
                $sort:
                {
                    finalTotal: -1
                }
            }
        ],
        function(err, result)
        {
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
                console.log('bb' + req.body.meetId + "," + req.body.sex);
                console.log(result);
                var matchResult = false;
                if (result.length > 0)
                {
                    matchResult = true;
                }
                res.json({status: "OK", match: matchResult});
            }
        }
    );
});

router.post('/searchTargetPic', function(req, res){
    var realResult = null;
    var before15Min = new Date(new Date().getTime() - 15*60000);

    function finalCallback(err, result){
        if (err){
            console.log(err);
            res.json({status:"Err", msg:err});
        }
        else{
            res.json({status: "OK", item: result});
        }
    }
    async.waterfall([
            function(next){
                db.get('info').col.aggregate(
                    [
                        {
                            $geoNear: {
                                near: { type: "Point", coordinates: [ Number(req.body.lng), Number(req.body.lat) ] },
                                distanceField: "lastLocation",
                                maxDistance: 500,
                                query: {
                                    lastLocationTime: {$gt:before15Min.getTime()},
                                    userName:{$ne: req.body.userName},
                                    sex:req.body.sex
                                },
                                //includeLocs: "dist.location",
                                //num: 100,
                                spherical: true
                            }
                        },
                        {
                            $project: {
                                finalTotal: {
                                    $let: {
                                        vars: {
                                            vhair: { $cond: { if: {$eq: ['$hair', req.body.hair]}, then: 1, else: 0 } },
                                            vglasses: { $cond: { if: {$eq: ['$glasses', req.body.glasses]}, then: 1, else: 0 } },
                                            vclothesType: { $cond: { if: {$eq: ['$clothesType', req.body.clothesType]}, then: 1, else: 0 } },
                                            vclothesColor: { $cond: { if: {$eq: ['$clothesColor', req.body.clothesColor]}, then: 1, else: 0 } },
                                            vclothesStyle: { $cond: { if: {$eq: ['$clothesStyle', req.body.clothesStyle]}, then: 1, else: 0 } }
                                        },
                                        in: { $add: [ "$$vhair", "$$vglasses", "$$vclothesType", "$$vclothesColor", "$$vclothesStyle" ] }
                                    }
                                },
                                userName: 1,
                                fileName: 1
                            }
                        },
                        {
                            $match :
                            {
                                finalTotal: {$gte: 4}
                            }
                        },
                        {
                            $sort:
                            {
                                finalTotal: -1
                            }
                        }
                    ],
                    next
                );
            },
            function(result, next){
                console.log("abc");
                console.log(result);
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

router.post('/rename', function(req, res){
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
                if (result.creater == req.body.userName)
                {
                    db.get('meet').findAndModify(
                        {
                            _id: req.body.meetId
                        }, // query
                        {
                            $set:
                            {
                                targetNick: req.body.newName
                            }
                        },
                        {new: true}, // options
                        function(err, result) {
                            if (err){
                                res.json({status:"Err", msg:err});
                            }else{
                                res.json({status: "OK", change: result.target});
                            }
                        });
                }
                else if (result.target == req.body.userName)
                {
                    db.get('meet').findAndModify(
                        {
                            _id: req.body.meetId
                        }, // query
                        {
                            $set:
                            {
                                createrNick: req.body.newName
                            }
                        },
                        {new: true}, // options
                        function(err, object) {
                            if (err){
                                res.json({status:"Err", msg:err});
                            }else{
                                res.json({status: "OK", change: result.creater});
                            }
                        });
                }
                else
                {
                    res.json({status:"Err", msg:"非法操作!"});
                }
            }
        }
    );
});


router.post('/getChatList', function(req, res) {
    userName = req.body.userName;
    friendUserName = req.body.friendUserName;

    //取得最后10条消息
    db.get('chat').find(
        {

            $or: [
                {
                    from: friendUserName,
                    to: userName
                },
                {
                    from: userName,
                    to: friendUserName
                }
            ]
        },
        {
            sort: {_id: -1},
            limit: 10
        },
        function(err, result)
        {
            if (err){
                res.json({status:"Err", msg:err});
            }
            else{
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
