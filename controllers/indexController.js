import connection from "../config.js"
const home = async(req,res,next)=>{
    res.redirect('/superadmin')
}

  
const howItWorks = async (req, res, next) => {
    const con = await connection();
    try {
      await con.beginTransaction();
      res.render('how_it_works') 
      await con.commit();
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  };

//--------------------- Export Start ------------------------------------------
export { home,howItWorks }

