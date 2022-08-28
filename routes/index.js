var express = require('express');
var router = express.Router();
var random_name = require('node-random-name');
const jwt=require('jsonwebtoken');

const mysql = require('mysql')
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'u2football'
});

connection.connect();

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function get_full_name(){
  return random_name({  gender: "male" });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


function new_player(userId,pozisyon){

  return {
    full_name: get_full_name(),
    pozisyon: pozisyon,
    yildiz: "Amatör",
    yas: randomInt(26, 36),
    H: randomInt(20, 50),
    O: randomInt(20, 50),
    D: randomInt(20, 50),
    K: randomInt(20, 50),
    kosu: randomInt(20, 50),
    refleksler: randomInt(20, 50),
    top_kontrolu: randomInt(20, 50),
    gol_yollarinda_etkinlik: randomInt(20, 50),
    ikili_mucadele: randomInt(20, 50),
    kondisyon: randomInt(20, 50),
    durum: "Sağlıklı",
    antrenman_puani: 100,
    goller: 0,
    kirmizi_kart: 0,
    sari_kart: 0,
    user: userId
  };

}

async function new_team(userId){
  let team=[];
  for (var i=0;i<16;i++){
    await delay(100);
    if (i<3){
      team.push(Object.values(new_player(userId,"Hücum")));
    }else if(i>3 && i<8){
      team.push(Object.values(new_player(userId,"Orta Saha")));
    }else if (i>8 && i<14){
      team.push(Object.values(new_player(userId,"Defans")));
    }else{
      team.push(Object.values(new_player(userId,"Kale")));
    }

  }
  return team;
}

router.get('/ekle',async(req,res)=>{
  let team=await new_team(2);


  let sqlSorgusu = `INSERT INTO players(full_name,pozisyon,yildiz,yas,H,O,D,K,kosu,refleksler,top_kontrolu,gol_yollarinda_etkinlik,ikili_mucadele,kondisyon,durum,antrenman_puani,goller,kirmizi_kart,sari_kart,user) VALUES ?`;
  try{
    connection.query(sqlSorgusu, [team], function (err, results) {
      if (err) throw err.message;
      console.log(results.affectedRows + ' kayıt eklendi.');
      res.send(results.affectedRows + ' kayıt eklendi.');
    });
  }catch (e) {
    console.log(e);
  }
});


router.get('/register',async(req,res)=>{
  const {username,password}=req.query;

  let sqlSorgusu = `INSERT INTO users VALUES(NULL, ?, ?,?,?);`;


  let user=[username,password,200,100000];
  connection.query(sqlSorgusu,user , async function (err, results) {
    if (err){

      if (err.errno==1062){
        res.json({
          status:false,
          msg:"Böyle bir kullanıcı zaten var!"
        });
      }else{
        console.log(err.message);

        res.json({
          status:false,
          msg:"Bir hata meydana geldi!"
        });
      }
    }else{

      let team=await new_team(results.insertId);
      let sqlSorgusu = `INSERT INTO players(full_name,pozisyon,yildiz,yas,H,O,D,K,kosu,refleksler,top_kontrolu,gol_yollarinda_etkinlik,ikili_mucadele,kondisyon,durum,antrenman_puani,goller,kirmizi_kart,sari_kart,user) VALUES ?`;
      connection.query(sqlSorgusu, [team], function (err, myteam) {
        if (err){
          console.log(err);
          res.json({
            status:false,
            msg:"Takım oluşturma hatası!"
          });
        }else{
          const token=jwt.sign({id:results.insertId,tdp:200,bank:100000},"gizlikeyimiz",{
            expiresIn:720
          });
          res.json({
            status:true,
            token:token,
            user:{id:results.insertId,tdp:200,bank:100000}
          });
        }
      });
    }
  });

});

router.get('/login',(req,res)=>{
  const {username,password}=req.query;
  connection.query(`SELECT * FROM users WHERE username='${username}' && password='${password}'`, function (err, results, fields) {
    if (err){
      console.log(err);
      res.json({
        status:false,
        msg:"Bir hata meydana geldi!"
      });
    }else{
      if (results.length){
        const jwtData=results[0];
        const token=jwt.sign({id:jwtData.id,username:jwtData.username,tdp:jwtData.tdp,bank:jwtData.bank},"gizlikeyimiz");
        res.json({
          status:true,
          token:token,
          user:results[0]
        });
      }else{
        res.json({
          status:false,
          msg:"Kullanıcı bulunamadı!"
        });
      }
    }

  });
});


router.get('/players',(req,res)=>{
  const {token}=req.query;

  if (token){
    jwt.verify(token,"gizlikeyimiz",(err,decoded)=>{
      if (err){
        res.json({
          status:false,
          msg:"Oturum doğrulamada hata."
        });
      }else{
        connection.query(`SELECT * FROM players WHERE user='${decoded.id}'`, function (err, results, fields) {
          if (err){
            console.log(err);
            res.json({
              status:false,
              msg:"Bir hata meydana geldi!"
            });
          }else{
            res.json({
              status:true,
              players:results
            });
          }

        });
      }
    });
  }else{
    res.json({
      status:false,
      msg:"No token"
    })
  }
});


module.exports = router;
