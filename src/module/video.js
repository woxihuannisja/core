const db = require('./database')
const logger = require('./logger')('Module: Video')
const metadata = require('./metadata')

class Video {
    /**
     * Get video info by id
     *
     * @param {Int} id video id
     *
     * @returns {Object} video info
     */
    async getVideoInfo (id) {
        logger.debug('Get video info, id', id)
        const result = await db('videos').where('id', id).select('*')

        if (!result) return null

        return {
            id: result.id,
            metadataId: result.metadataId,
            videoFileId: result.videoFileId,
            isHiden: (item.isHiden === 1),
            infoFileId: result.infoFileId,
            videoMetadata: JSON.parse(result.videoMetadata),
            storyboardFileIdSet: JSON.parse(result.storyboardFileIdSet),
            updateTime: result.updateTime
        }
    }

    /**
     * Get video list
     *
     * @param {Int=} page page number
     * @param {Int=} size page size
     * @param {Boolean=} showHiden show hiden video
     * @param {Int=} get list by metadata id
     *
     * @returns {Array} video info list
     */
    async getVideoList (page = 1, size = 20, showHiden = false, metadataId = 0) {
        let result
        result = db('videos')
        if (!showHiden) result = result.where('isHiden', 0)
        if (metadataId !== 0) result = result.where('metadataId', metadataId)
        result = await result.orderBy('id', 'desc').select('*').paginate({
            perPage: size,
            currentPage: page
        })

        result = result.data
        if (!result) return []

        const processed = []
        for (const i in result) {
            const item = result[i]
            processed.push({
                id: item.id,
                metadataId: item.metadataId,
                videoFileId: item.videoFileId,
                isHiden: (item.isHiden === 1),
                infoFileId: item.infoFileId,
                videoMetadata: JSON.parse(item.videoMetadata),
                storyboardFileIdSet: JSON.parse(item.storyboardFileIdSet),
                updateTime: item.updateTime
            })
        }

        return processed
    }

    /**
     * Hide video by video id
     *
     * @param {Int} id video id
     *
     * @returns {Boolean}
     */
    async hideVideo (id) {
        if (await db('videos').where('id', id).update('isHiden', 1)) return true
        return false
    }

    /**
     * Unhide video by video id
     *
     * @param {Int} id video id
     *
     * @returns {Boolean}
     */
    async unhideVideo (id) {
        if (await db('videos').where('id', id).update('isHiden', 0)) return true
        return false
    }

    /**
     * Create video record
     *
     * @param {Object} info JAV info
     * @param {Object} fileIds File ids
     * @param {Int} fileIds.metaId info.js file id
     * @param {Int} fileIds.videoId video.mp4 file id
     * @param {Int} fileIds[storyboardId].id storyboard file id
     *
     * @returns {Int} Video id
     */
    async createVideo (info, fileIds) {
        const JAVID = info.company + '-' + info.id

        let result = await db('videos').whereRaw('JSON_EXTRACT(videoMetadata, \'$.hash\') = ?', info.hash).select('id').first()
        logger.debug('JAV hash', info.hash, result)

        if (result && result.id) {
            logger.info('Duplicate video exist, skipped', result)
            return result.id
        }

        const metaId = await metadata.getMetadataId(JAVID)
        logger.debug('Metadata id', metaId)

        if (metaId === 0) {
            return
        }

        result = await db('videos').insert({
            videoMetadata: JSON.stringify(info),
            isHiden: 0,
            videoFileId: fileIds.videoId,
            metadataId: metaId,
            storyboardFileIdSet: JSON.stringify(fileIds.storyboardId),
            infoFileId: fileIds.metaId,
            updateTime: (new Date()).getTime()
        }).select('id')

        logger.info(`[${JAVID}] Video created, id`, result[0])
        return result[0]
    }

    /**
     * Check video status by meta hash
     *
     * @param {String} hash video meta hash
     *
     * @returns {Boolean}
     */
    async isExistByHash (hash) {
        const result = await db('videos').whereRaw('JSON_EXTRACT(videoMetadata, \'$.hash\') = ?', hash).count()
        if (result && result[0]['count(*)'] === 0) return false
        return true
    }

    /**
     * Get video id by info.json file id
     *
     * @param {String} infoFileId
     *
     * @returns {Int} video id
     */
    async getVideoIdByInfoFileId (infoFileId) {
        const result = await db('videos').where('infoFileId', infoFileId).select('id').first()

        if (result && result.id) {
            return result.id
        } else return 0
    }
}

module.exports = new Video()
