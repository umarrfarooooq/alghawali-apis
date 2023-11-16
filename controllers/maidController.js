const Maid = require("../Models/Maid")
const cloudinary = require("../config/cloudinaryConfig")

const generateUniqueCode = async (countryCode) => {
  let isUnique = false;
  let code;

  while (!isUnique) {
    code = `${countryCode}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const existingMaid = await Maid.findOne({ code });

    if (!existingMaid) {
      isUnique = true;
    }
  }

  return code;
};

exports.addMaid = async (req, res) =>{
  try {
    const results = [];
    const images = ['maidImg', 'maidImg2', 'maidImg3', 'maidImg4'];

    for (const image of images) {
      if (req.files[image] && req.files[image].length > 0) {
        const result = await cloudinary.uploader.upload(req.files[image][0].path, {
          format: 'webp',
          overwrite: true
        });
        results.push(result);
      }
      else {
        results.push({ public_id: undefined });
      }
    }

    if (req.files['videoLink'] && req.files['videoLink'].length > 0) {
      const videoResult = await cloudinary.uploader.upload(req.files['videoLink'][0].path, {
        resource_type: 'video',
        format: 'webm',
        overwrite: true,
        secure: true,
        eager_async: true,
        eager: [
          {
              fetch_format: 'webm',
          },
      ],
        transformation: [
          { width: 1000, crop: 'scale' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ],
      });
      

      results.push(videoResult);
    } else {
      results.push({ public_id: undefined });
    }

    let country;

    const nationality = req.body.nationality.toLowerCase();

    if (nationality === 'myanmar') {
        country = 'MN';
    } else if (nationality === 'nepal') {
        country = 'NP';
    } else if (nationality === 'sri lanka') {
        country = 'SL';
    } else if (nationality === 'india') {
        country = 'IN';
    } else {
        country = 'GL';
    }
    
    if (!country) {
      return res.status(400).json({ error: 'Invalid country' });
    }

    const maidCode = await generateUniqueCode(country);

    
    const experienceYears = req.body.experienceYears;
    const experienceCountry = req.body.experienceCountry;

    let experience;

    if (!experienceYears || !experienceCountry) {
      experience = `New`
    }else{
      experience = `${experienceYears} from ${experienceCountry}`;
    }

    const maidNationality = (req.body.nationality === 'Other') ? req.body.otherNationality : req.body.nationality;
    const maidReligion = (req.body.religion === 'Other') ? req.body.otherReligion : req.body.religion;
    const allLanguages = Array.isArray(req.body.languages)
    ? req.body.languages.includes('Other')
      ? [...req.body.languages.filter(lang => lang !== 'Other'), req.body.otherLanguages].join(', ')
      : req.body.languages.join(', ')
    : '';

      const newMaid = new Maid({
        code: maidCode,
        name: req.body.name,
        nationality:maidNationality,
        position:req.body.position,
        salery:req.body.salery,
        price:req.body.price,
        religion:maidReligion,
        maritalStatus:req.body.maritalStatus,
        childrens:req.body.childrens,
        age:req.body.age,
        appliedFor:req.body.appliedFor,
        experience:experience,
        education:req.body.education,
        languages:allLanguages,
        contractPeriod:req.body.contractPeriod,
        remarks:req.body.remarks,
        maidImg:results[0].public_id || '',
        maidImg2:results[1].public_id || '',
        maidImg3:results[2].public_id || '',
        maidImg4:results[3].public_id || '',
        videoLink:results[4].public_id || '',
      });
      const savedMaid = await newMaid.save();
  
      res.status(201).json(savedMaid);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  
}


exports.updateMaid = async (req, res) => {
  try {
    const maidId = req.params.id;
    const updatedMaidData = req.body;
    const existingMaid = await Maid.findById(maidId);

    if (!existingMaid) {
      return res.status(404).json({ error: 'Maid not found' });
    }

    let result;
    if (req.file) {
      await cloudinary.uploader.destroy(existingMaid.maidImg);

      result = await cloudinary.uploader.upload(req.file.path, {
        format: 'webp',
        overwrite: true
      });
    }

    const updatedMaid = {
      ...updatedMaidData,
      maidImg: result?.public_id || existingMaid.maidImg,
    };

    const updatedMaidInstance = await Maid.findByIdAndUpdate(maidId, updatedMaid, { new: true });

    res.status(200).json(updatedMaidInstance);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};


exports.deleteMaid = async (req, res) =>{
    try {
        const maidId = req.params.id;
        const findMaidForDelete = await Maid.findById({_id: maidId});

        if (findMaidForDelete.maidImg) {
        await cloudinary.uploader.destroy(findMaidForDelete.maidImg);
        }
        if (findMaidForDelete.maidImg2) {
          await cloudinary.uploader.destroy(findMaidForDelete.maidImg2);
        }
    
        if (findMaidForDelete.maidImg3) {
          await cloudinary.uploader.destroy(findMaidForDelete.maidImg3);
        }
    
        if (findMaidForDelete.maidImg4) {
          await cloudinary.uploader.destroy(findMaidForDelete.maidImg4);
        }
        if (findMaidForDelete.videoLink) {
          await cloudinary.uploader.destroy(findMaidForDelete.videoLink);
        }

        const deletedMaid = await Maid.findByIdAndDelete({_id: maidId});
        if (!deletedMaid) {
          return res.status(404).json({ error: 'Maid not found' });
        }
    
        res.status(204).send("Deleted");
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
}

exports.getAllMaids = async (req, res) => {
  try {
    const { search, page = 1 } = req.query;

    let query = {};

    const maidCount = await Maid.countDocuments(query);

    const perPage = maidCount > 0 ? maidCount : 15;

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ],
      };
    }

    const offset = (page - 1) * perPage;

    const allMaids = await Maid.find(query)
      .skip(offset)
      .limit(Number(perPage));

    const availableMaids = allMaids.filter((maid) => !maid.isHired);
    res.status(200).json(availableMaids);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};


exports.getMaid = async (req, res) =>{
    try {
        const maidId = req.params.id;
    
        const maid = await Maid.findById(maidId);
    
        if (!maid) {
          return res.status(404).json({ error: 'Maid not found' });
        }
    
        res.status(200).json(maid);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
}

exports.updateMaidAvailablity = async (req, res) => {
  try {
      const maidId = req.params.id;
      const existingMaid = await Maid.findById(maidId);

      if (!existingMaid) {
          return res.status(404).json({ error: 'Maid not found' });
      }
      if(existingMaid.isHired){
        existingMaid.isHired = false;
      }else{
        existingMaid.isHired = true;
      }
      await existingMaid.save();

      res.status(200).json(existingMaid);
  } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
  }
}
