const bcrypt = require('bcrypt');
const createError = require('http-errors');
const sharp = require('sharp');

const prisma = require('../../libs/prisma');
const { normalizePhone } = require('../../utils/normalizer');
const { uploadFile, deleteFile } = require('../../libs/imagekit');

module.exports = {
    getProfile: async (payload) => {
        let user = payload.user;

        let result = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                username: true,
                profile: {
                    select: {
                        name: true,
                        phoneNumber: true,
                        avatar: { select: { url: true, thumbnailUrl: true } },
                    },
                },
                role: { select: { name: true } },
            },
        });

        return {
            id: result.id,
            username: result.username,
            name: result.profile.name,
            phoneNumber: result.profile.phoneNumber,
            role: result.role.name,
            avatar: result.profile.avatar,
        };
    },

    updateProfile: async (payload) => {
        let { name, username, phoneNumber, password, user } = payload;

        let exist = await prisma.user.findUnique({
            where: { username: user.username, NOT: { username: user.username } },
        });

        if (exist) {
            throw createError.Conflict('Username already exist');
        }

        let hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

        let userData = {
            username: username ?? undefined,
            password: hashedPassword,
        };
        let profileData = {
            name: name ?? undefined,
            phoneNumber: phoneNumber ? normalizePhone(phoneNumber) : undefined,
        };

        let result = await prisma.user.update({
            where: { id: user.id },
            data: { ...userData, profile: { update: profileData } },
            select: {
                id: true,
                username: true,
                profile: { select: { name: true, phoneNumber: true } },
                role: { select: { name: true } },
            },
        });

        return {
            id: result.id,
            username: result.username,
            name: result.profile.name,
            phoneNumber: result.profile.phoneNumber,
            role: result.role.name,
        };
    },

    updateAvatar: async (payload) => {
        let { strFile, user } = payload;

        let compressedBuffer;
        try {
            let imgBuffer = Buffer.from(strFile, 'base64');
            let img = sharp(imgBuffer).rotate();
            let metadata = await img.metadata();

            let size = Math.min(metadata.width, metadata.height);
            let left = Math.floor((metadata.width - size) / 2);
            let top = Math.floor((metadata.height - size) / 2);

            const MIN_SIZE = 1024;
            const MAX_SIZE = 1024;

            let resizeSize = Math.min(Math.max(size, MIN_SIZE), MAX_SIZE);

            compressedBuffer = await img
                .extract({
                    left: left,
                    top: top,
                    width: size,
                    height: size,
                })
                .resize(resizeSize, resizeSize, {
                    fit: 'fill',
                    position: 'center',
                    withoutEnlargement: false,
                })
                .jpeg({ quality: 80 })
                .toBuffer();
        } catch (e) {
            throw createError(500, 'Failed to process image');
        }

        let timestamp = Date.now();
        let folder = `profiles`;

        let avatar = await uploadFile({
            file: compressedBuffer.toString('base64'),
            fileName: `${timestamp}.jpeg`,
            folder,
            useUniqueName: true,
        });

        return await prisma.$transaction(async (tx) => {
            let profile = await tx.profile.findUnique({
                where: { userId: user.id },
                select: { id: true, avatarId: true },
            });

            if (profile.avatarId) {
                let oldFile = await tx.file.findUnique({
                    where: { id: profile.avatarId },
                    select: { imagekitId: true },
                });

                await deleteFile(oldFile.imagekitId);
            }

            let data = {
                filename: avatar.name || originalName,
                url: avatar.url,
                mimetype: 'image/jpeg',
                size: avatar.size,
                thumbnailUrl: avatar.thumbnailUrl || null,
                imagekitId: avatar.fileId,
                uploadedById: user.id,
            };

            let result = await tx.file.create({
                data,
                select: {
                    id: true,
                    filename: true,
                    url: true,
                    mimetype: true,
                    size: true,
                    thumbnailUrl: true,
                    imagekitId: true,
                    uploadedById: true,
                },
            });

            await tx.profile.update({
                where: { id: profile.id },
                data: { avatarId: result.id },
            });

            return {
                id: result.id,
                fileName: result.filename,
                url: result.url,
                mimetype: result.mimetype,
                size: result.size,
                thumbnailUrl: result.thumbnailUrl,
                imagekitId: result.imagekitId,
                uploadedById: result.uploadedById,
            };
        });
    },

    deleteAvatar: async (payload) => {
        let user = payload.user;

        let profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { avatarId: true, avatar: { select: { imagekitId: true } } },
        });

        if (!profile.avatarId) throw createError(404, 'Avatar not found');

        await deleteFile(profile.avatar.imagekitId);

        await prisma.file.delete({
            where: { id: profile.avatarId },
        });

        return null;
    },
};
