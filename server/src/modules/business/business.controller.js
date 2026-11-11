import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Multer setup for logo uploads ───────────────────────────────────────────

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'logos');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `logo-${req.businessId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const logoFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP, SVG) are allowed.'), false);
  }
};

export const logoUpload = multer({
  storage: logoStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ─── getProfile ───────────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
      include: {
        settings: true,
        bankAccounts: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        users: {
          select: { id: true },
        },
      },
    });

    if (!business) {
      return error(res, 'Business not found.', 404);
    }

    const { users, ...businessData } = business;

    return success(res, {
      ...businessData,
      userCount: users.length,
    }, 'Business profile fetched successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── updateProfile ────────────────────────────────────────────────────────────

export const updateProfile = async (req, res, next) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: req.body,
    });

    return success(res, business, 'Business profile updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── onboard ─────────────────────────────────────────────────────────────────

export const onboard = async (req, res, next) => {
  try {
    // If user already has a business, return it
    if (req.businessId) {
      const existing = await prisma.business.findUnique({
        where: { id: req.businessId },
        include: { settings: true },
      });
      return success(res, existing, 'Business already exists.');
    }

    const {
      name,
      businessType,
      address,
      city,
      state,
      stateCode,
      pincode,
      phone,
      email,
      website,
      gstin,
      pan,
      isGstRegistered,
      authorizedSignatory,
      jurisdiction,
      declaration,
    } = req.body;

    // Create business, link user, and create default settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name,
          businessType: businessType || null,
          address: address || null,
          city: city || null,
          state: state || null,
          stateCode: stateCode || null,
          pincode: pincode || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          gstin: gstin || null,
          pan: pan || null,
          isGstRegistered: isGstRegistered ?? false,
          authorizedSignatory: authorizedSignatory || null,
          jurisdiction: jurisdiction || null,
          declaration: declaration || null,
          onboardingCompleted: true,
        },
      });

      // Link user to the new business as OWNER
      await tx.businessUser.create({
        data: {
          userId: req.user.id,
          businessId: business.id,
          role: 'OWNER',
        },
      });

      // Create default settings
      const settings = await tx.businessSettings.create({
        data: {
          businessId: business.id,
        },
      });

      return { ...business, settings };
    });

    return success(res, result, 'Business onboarded successfully.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── getSettings ─────────────────────────────────────────────────────────────

export const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.businessSettings.findUnique({
      where: { businessId: req.businessId },
    });

    // Auto-create settings if they don't exist
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: { businessId: req.businessId },
      });
    }

    return success(res, settings, 'Business settings fetched successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── updateSettings ───────────────────────────────────────────────────────────

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await prisma.businessSettings.upsert({
      where: { businessId: req.businessId },
      update: req.body,
      create: {
        businessId: req.businessId,
        ...req.body,
      },
    });

    return success(res, settings, 'Business settings updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── listBankAccounts ─────────────────────────────────────────────────────────

export const listBankAccounts = async (req, res, next) => {
  try {
    const bankAccounts = await prisma.businessBankAccount.findMany({
      where: { businessId: req.businessId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return success(res, bankAccounts, 'Bank accounts fetched successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── addBankAccount ───────────────────────────────────────────────────────────

export const addBankAccount = async (req, res, next) => {
  try {
    const { accountHolder, bankName, accountNumber, ifscCode, branch, upiId, isDefault } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // If this account is being set as default, unset current default
      if (isDefault) {
        await tx.businessBankAccount.updateMany({
          where: { businessId: req.businessId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const bankAccount = await tx.businessBankAccount.create({
        data: {
          businessId: req.businessId,
          accountHolder,
          bankName,
          accountNumber,
          ifscCode,
          branch: branch || null,
          upiId: upiId ? upiId.trim() : null,
          isDefault: isDefault ?? false,
        },
      });

      return bankAccount;
    });

    return success(res, result, 'Bank account added successfully.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── updateBankAccount ────────────────────────────────────────────────────────

export const updateBankAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.businessBankAccount.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return error(res, 'Bank account not found.', 404);
    }

    const { accountHolder, bankName, accountNumber, ifscCode, branch, upiId, isDefault } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // If setting as default, unset all others first
      if (isDefault) {
        await tx.businessBankAccount.updateMany({
          where: { businessId: req.businessId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.businessBankAccount.update({
        where: { id },
        data: {
          ...(accountHolder !== undefined && { accountHolder }),
          ...(bankName !== undefined && { bankName }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(ifscCode !== undefined && { ifscCode }),
          ...(branch !== undefined && { branch: branch || null }),
          ...(upiId !== undefined && { upiId: upiId ? upiId.trim() : null }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
    });

    return success(res, result, 'Bank account updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── deleteBankAccount ────────────────────────────────────────────────────────

export const deleteBankAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.businessBankAccount.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return error(res, 'Bank account not found.', 404);
    }

    await prisma.businessBankAccount.delete({ where: { id } });

    // If the deleted account was default, promote the first remaining account
    if (existing.isDefault) {
      const nextAccount = await prisma.businessBankAccount.findFirst({
        where: { businessId: req.businessId },
        orderBy: { createdAt: 'asc' },
      });
      if (nextAccount) {
        await prisma.businessBankAccount.update({
          where: { id: nextAccount.id },
          data: { isDefault: true },
        });
      }
    }

    return success(res, null, 'Bank account deleted successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── uploadLogo ───────────────────────────────────────────────────────────────

export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'No file uploaded. Please provide an image file.', 400);
    }

    // Store relative path for portability
    const logoPath = `uploads/logos/${req.file.filename}`;

    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: { logoPath },
      select: { id: true, name: true, logoPath: true },
    });

    return success(res, {
      logoPath: business.logoPath,
      logoUrl: `${process.env.SERVER_URL || ''}/uploads/logos/${req.file.filename}`,
    }, 'Logo uploaded successfully.');
  } catch (err) {
    next(err);
  }
};
