'use strict';
/**
 * Module exports.
 * @public
 */

const got = require('got');
const cheerio = require('cheerio');
const cookie = require('cookie');
const setCookie = require('set-cookie-parser');
const URL = require('url');

exports.getMediaLink = getMediaLink;

/**
 * Get the media link (video url and thumb url) of the given google drive document id. 
 * @param {string} docId 
 * @returns 
 */
async function getMediaLink(docId) {
    try {
        
        const reqMedia = await got.get('https://drive.google.com/uc?id=' + docId + '&export=download', {
            followRedirect: false
        }).catch((x) => {
            // if(x.statusCode && x.statusCode===404) return createFailedResponse(2, 'No resource found');
            // return createFailedResponse(100, 'Unknown error');
            return createFailedResponse(x.statusCode, x.message);
        });
        if (reqMedia.statusCode === 200) {
            //we got something to work on.
        }
        else if (reqMedia.statusCode > 300 && reqMedia.statusCode < 400) {
            const u = URL.parse(reqMedia.headers.location);
            if (u.hostname.endsWith('googleusercontent.com')) {
                return createSuccessResponse(reqMedia.headers.location);
            }
            else {
                //redirect occurs, possibly media not shared.
                return createFailedResponse(401, 'Unauthorized');
            }
        }
        else {
            return reqMedia;
        }
        const responseCookies = setCookie.parse(reqMedia.headers["set-cookie"]);
        const nextRequestCookies = responseCookies
            .filter((x) => x.domain === '.drive.google.com')
            .map((x) => {
                return cookie.serialize(x.name, x.value);
            }).join(';');

        const $ = cheerio.load(reqMedia.body);
        const nextPostLocation = $('form').attr('action');
        const reqMediaConfirm = await got.post(nextPostLocation, {
                headers: {
                cookie: nextRequestCookies
            }, followRedirect: false
        });

        const videoSource = reqMediaConfirm.headers.location;
        return createSuccessResponse(videoSource);
    } catch (error) {
        throw ('Error while fetching the media link.' + error);
    }
}

function createFailedResponse(status, error) {
    return {
        satusCode: status,
        error: error
    }
}

function createSuccessResponse(videoSource) {
    return videoSource
}
