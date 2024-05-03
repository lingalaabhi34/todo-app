const accessmodel = require("../models/acessmodel");
const ratelimiting = async (req, res, next) => {
  // console.log("rate limit middle ware");

  const sid = req.session.id;
  //find the entry in accessDB

  try {
    const accessDb = await accessmodel.findOne({ sessionId: sid });

    //if null then it's first request
    // console.log(accessDb);
    if (!accessDb) {
      const accessObj = new accessmodel({
        sessionId: sid,
        req_time: Date.now(),
      });

      await accessObj.save();
      next();
      return;
    }

    //R2 -- Rnth, compare the time diff
    // console.log((Date.now() - accessDb.reqtime) / 1000);
    const diff = (Date.now() - accessDb.reqtime) / 1000;

    // 1hit / per second
    if (diff < 1) {
      return res.send({
        status: 400,
        message: "Too many request, please wait for time.",
      });
    }

    //update the time if diff is greater than logic
    await accessmodel.findOneAndUpdate(
      { sessionId: sid },
      { req_time: Date.now() }
    );

    next();
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }

  //   next();
};

module.exports = ratelimiting;
