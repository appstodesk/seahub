/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

(function () {
    console.log('starting Eyeos modifications');

    var openInEyeosExtensions = {
        'xls': 'calc',
        'xlsx': 'calc',
        'ods': 'calc',
        'csv': 'calc',
        'doc': 'writer',
        'docx': 'writer',
        'odt': 'writer',
        'ppt': 'presentation',
        'pptx': 'presentation',
        'pps': 'presentation',
        'ppsx': 'presentation',
        'odp': 'presentation',
        'xcf': 'gimp'
    };

    var desktopBusSubscriptions = [];
    var onRouteChangeActions = [];
    var currentLibraryName;
    window.onunload = onUnload;

    // Seafile pages that are *NOT* sharing: should be opened inside Open365
    if (isSeafileStandalone()) {
        $("BODY").css("display", "none");   // Will avoid showing content before redirection
        var seafileUrl = window.location.pathname + window.location.hash;
        if (window.location.search) {
            seafileUrl += window.location.search;
        }

        seafileUrl = btoa(seafileUrl);

        window.location.href="/?target="+ seafileUrl;

    // External seafile (share) pages
    } else if (!isSeafileIframe()) {

        customizeNonIframePages();
    }

    hideWelcomePage();
    modifyPage();
    moveUserQuotaUnderLeftPanel();
    listenChangePasswordEvent();
    modifyUrlDownloadClient();

   
    if ("onhashchange" in window) {
        // does the browser support the hashchange event?
        window.onhashchange = function () {
            console.info('ROUTE CHANGED', window.location.hash);
            $('.repo-file-list tbody *').remove();
            onRouteChangeActions.forEach(function(action){action()});
            onRouteChangeActions.length = 0;

            modifyPage();
            moveUserQuotaUnderLeftPanel();
        };
        
    } else {
        console.error('Your browser does not support onhashchange. This code won\'t work.');
    }


    function customizeNonIframePages() {
        // Manipulate base DOM and STYLES
        var header = document.getElementById("header");
        var mainDiv = document.getElementById("main");
        var footer = document.getElementById("footer");
        var footerHeight = footer.offsetHeight;

        header.style.display = "block";
        document.getElementById("logo").setAttribute("href", "https://open365.io/?source=shareByUrl");
        document.getElementById("logo").setAttribute("target", "_blank");
        mainDiv.style.width = "97%";
        mainDiv.style.marginTop = 0;
        mainDiv.style.marginTop = "30px";

        window.addEventListener('resize', customizeFileSharePage);

        if (locationIsResourceView()) {
            createOpen365header();
        }
        
        customizeFileSharePage();
        hideElementsNonIframe();
        mainDiv.style.height = mainDiv.offsetHeight + footer.offsetHeight + "px";
    }

    function isSeafileIframe() {
        return parent.document.getElementById('seahubIframe');
    }

    function locationIsResourceView() {
        return window.top.location.pathname.indexOf('/sync/lib/') > -1;
    }

    function isSeafileStandalone() {
        var result = false;
        var seafileUrl = window.location.pathname + window.location.hash;

        if (window.location.search) {
            seafileUrl += window.location.search;
            result = !/^\/sync\/repo\/[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}\/history\/files\/\?obj_id\=[0-9]*\&commit_id\=[0-9a-z]{40}\&p\=/.test(seafileUrl);
        } else {
            result = /^\/sync\/[#a-z]{1}(\/[a-z]{1})?\/[0-9a-z]{10}\/$/.test(seafileUrl);
        }

        // return TRUE if both conditions are FALSE
        return !result && !isSeafileIframe();
    }

    function hideElementsNonIframe() {
        $("#msg-count, #my-info").css({
            display: 'none'
        });
    }

    function getUrlVar(variable) {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars[variable];
    }

    // If there is NO div with 'wide-panel' class element, then we are being called from the
    // file share page and thus we may do some hacks to the DOM
    function customizeFileSharePage() {
        if (!document.getElementsByClassName('wide-panel').length) {
            var mainDiv = document.getElementById("main");
            var logoElement = document.getElementById("logo");
            var logoLeft = logoElement.offsetLeft;
            var mainWidth = mainDiv.offsetWidth;
            mainDiv.style.width = "calc(97% - "+ (logoLeft * 2) + "px)";
            mainDiv.style.marginLeft = logoLeft + "px";
            mainDiv.className += " share-wrapper";
        }
    }

    // If there's no header, create one
    function createOpen365header() {
        // Only 'file-view' pages appear to dont have a header
        if (document.getElementById("file-view")) {
            var wrapper = document.getElementById("wrapper");
            var headerDiv = document.createElement("DIV");
            headerDiv.id = "header";
            headerDiv.style.display = "block";
            headerDiv.innerHTML = "<div id='header-inner'> <a href='https://open365.io/?source=shareByUrl' id='logo' class='fleft'></a> </div>";
            wrapper.insertBefore(headerDiv, wrapper.firstChild);
        }
    }

    // Adjust footer position
    function adjustFooterPosition() {
        var footer = document.getElementById("footer");
        var bodyHeight = document.documentElement.scrollHeight;
        var viewportHeight = window.innerHeight;
        var footerHeight = footer.offsetHeight;
        var headerHeight = header.offsetHeight;
        var newFooterPos = 0;
        var publicMessageHeight = document.getElementById("publicMessage").offsetHeight;
        var minHeight = viewportHeight - headerHeight - publicMessageHeight - footerHeight - 50;
        document.getElementById("main").style.minHeight = minHeight + "px";
    }
    
    function moveUserQuotaUnderLeftPanel() {
        if(window.location.hash === "" || window.location.hash.indexOf('my-libs') !== -1) {
            console.log('update user quota view');
            var url = location.protocol+"//"+document.domain+':'+location.port + '/sync/ajax/space_and_traffic/';
            $.ajax(url, {
                success: function(data) {
                    var quota = $(data.html);
                    waitForElement('#left-panel a[href="/sync/share/links/"]', function (elem) {
                        $('#left-panel > .item').remove();
                        $('#left-panel').append(quota);
                    }, 200, -1);
                }
            });
        } else {
            $('#left-panel > .item').remove();
        }

    }

    function removeQuotaLink() {
        var anchor = document.getElementById("quota-usage");
        if (anchor) {
            anchor.parentNode.removeAttribute("href");
        }
    }

    function encryptSwitchMod() {
        waitForElement("#right-panel #repo-tabs DIV.hd", function() {
            $("BUTTON.repo-create")[0].onclick = function() {
                waitForElement("LABEL.checkbox-label", function() {
                    $("#encrypt-switch").click(function() {
                        var msgSpan;
                        if ( !(msgSpan = document.getElementById("encryptMessage")) ) {
                            msgSpan = document.createElement("SPAN");
                            msgSpan.innerHTML = " not supported in LibreOffice";
                            msgSpan.style.color = "red";
                            msgSpan.style.fontWeight = "normal";
                            msgSpan.setAttribute("id", "encryptMessage");
                            $("LABEL.checkbox-label")[0].appendChild(msgSpan);
                        } else {
                            $(msgSpan).remove();
                        }
                    });
                }, 200, 3000);
            };
        }, 150, 5000);
    }

    function modifyPage () {
        updateFileListOnClickBehaviour();
        activateNotification();
        encryptSwitchMod();

        waitForElement('#right-panel UL LI *', function() {
            if (window.location.href.indexOf('/wiki/') !== -1) {
                $("a[href^='/sync/repo/history/']").removeAttr("target");
            }
        }, 300, 3000);

        waitForElement('#quota-usage', removeQuotaLink, 300, 3000);

        waitForElement('.dirent-name .normal:not(.dir-link)', function (elem) {
            console.log(' - Going to modify links in current page');

            var filesDomElements = elem.toArray();
            filesDomElements.forEach(function (item){
                openLinkInEyeosDesktop(item);
            });

        }, 500, 10000);

        var observerStarredList = onDomChange('#starred-file > table > tbody' , function (elem) {
            var filesDomElements = $(elem.children).toArray();
            filesDomElements.forEach(function (item){
                var aLink = item.children[1].children[0];
                var libraryName = item.children[2].innerHTML;
                openLinkInEyeosDesktop(aLink, libraryName);
            });
        });
        onRouteChangeActions.push(function (){
            observerStarredList.disconnect();
        });
    }

    function updateFileListOnClickBehaviour () {
        $('.repo-file-list tbody').hide();
        var observer = onDomChange('.repo-file-list tbody', function (fileList){
            getCurrentLibraryName(function (err, libraryName) {
                if(err) {
                    console.warn('Could not get current library name');
                    return;
                }
                currentLibraryName = libraryName;
                $(fileList)
                    .show()
                    .find('.dirent-name .normal:not(.dir-link)')
                    .toArray()
                    .forEach(function (item) {
                        openLinkInEyeosDesktop(item);
                    });
            });

        });
        onRouteChangeActions.push(function (){
            observer.disconnect();
        });
    }


    function openLinkInEyeosDesktop(aLink, libraryName) {
        libraryName = libraryName || currentLibraryName;
        var filePath = getEyeosPathFromHref(aLink);
        var ext = filePath.split('.').pop().toLowerCase();
        if(!openInEyeosExtensions[ext]){
            return;
        }
        aLink.onclick=function(e){
            e.preventDefault();
            e.stopPropagation();
            sendOpenFileToDesktop(libraryName + filePath);
        }
    }

    function sendOpenFileToDesktop(path) {
        var desktopBus = getDesktopBus();
        if (desktopBus) {
            console.info('Send openFile event to desktop with path: ', path);
            var event = {
                name: 'eyeosCloud.fileOpened',
                path: path
            };
            desktopBus.dispatch(event.name, event);
        } else {
            console.error('No desktopBus present in parent iframe');
        }
    }

    function waitForElement(cssSelector, cb, retryIntervalTime, MAX_WAIT_TIME) {
        var timeCounter = 0;

        internalWaitForElement(cssSelector, cb);

        function internalWaitForElement (cssSelector, cb) {

            var elem = $(cssSelector);
            if (elem.length > 0) {
                cb(elem);
            } else {
                timeCounter += retryIntervalTime;
                if (timeCounter > MAX_WAIT_TIME && MAX_WAIT_TIME > 0) {
                    console.log('stop waiting cssSelector: ', cssSelector);
                    return;
                }
                setTimeout(internalWaitForElement.bind(this, cssSelector, cb), retryIntervalTime);
            }
        }
    }

    function getEyeosPathFromHref (aHref) {
        // detect first position of '/file' and return the rest of the url
        var href = $(aHref).attr('href');
        var pos;
        if ((pos = href.indexOf('/file')) !== -1) {
            // in the href the url is encoded, so decode it. decodeURI didn't
            // decode adequately hash simbols (#), so we are using
            // decodeURIComponent instead.
            return decodeURIComponent(href.substr(pos + '/file'.length));
        }
        return '';
    }

    function getDesktopBus () {
        return window.parent.DesktopBus;
    }

    function getCurrentLibraryId() {
        var hashParts = location.hash.split('/');
        var libIdIndex = hashParts.indexOf("lib") + 1;
        return hashParts[libIdIndex];
    }

    function getCurrentLibraryName (cb) {
        var repoId = getCurrentLibraryId();
        return getLibraryName(repoId, cb);
    }

    function getLibraryName (repoId, callback) {
        function _getLibraryNameFromListOfLibraries (libraries) {
            for (var i = 0; i < libraries.length; i++) {
                var library = libraries[i];
                if (library.id === repoId) {
                    return library.name;
                }
            }
            console.log("Couldn't find library name. How could that be possible?");
            return false;
        }

        function _isLibraryNameRepeated (name, libraries) {
            var num = 0;
            for (var i = 0; i < libraries.length; i++) {
                var library = libraries[i];
                if (library.name === name) {
                    num++;
                    if (num > 1) {
                        return true;
                    }
                }
            }
            return false;
        }

        var url = '/sync/api2/repos/';
        $.ajax(url, {
            success: function(libraries) {
                if (libraries && libraries.length) {
                    var name = _getLibraryNameFromListOfLibraries(libraries);
                    if (!name) {
                        return callback(new Error('Can\'t get the name of the library'));
                    }
                    if (_isLibraryNameRepeated(name, libraries)) {
                        name += '-' + repoId.substr(0, 6);
                    }
                    return callback(null, name);
                } else {
                    callback(new Error('Can\'t get the name of the library'));
                }
            },
            error: function (err) {
                callback(err);
            }
        });
    }

    function hideWelcomePage () {
        var interv = setInterval(function () {
            if (window.app && window.app.pageOptions) {
                window.app.pageOptions.guide_enabled=false;
                window.clearInterval(interv);
            }
        }, 10);

        window.setTimeout(function () {
            clearInterval(interv);
        }, 2000);
    }

    function onDomChange (cssSelector, cb) {
        var target = document.querySelector(cssSelector);
        if(!target) {
            return;
        }
        var observer = new MutationObserver(function(mutations) {
            cb(target);
        });

        var config = { attributes: false, childList: true, characterData: true, subtree:true };

        observer.observe(target, config);
        return observer;
    }

    function listenChangePasswordEvent () {
        var desktopBus = getDesktopBus();
        if(!desktopBus) {
            console.warn('Can\'t listen to desktop bus. Change password won\'t work');
            return;
        }
        var subscription = desktopBus.subscribe('changePasswordSuccess', doLogoutAndGoToLogin);
        desktopBusSubscriptions.push(subscription);
    }

    function doLogoutAndGoToLogin () {
        function reloadSeahubIframe () {
            console.info('Reloading seahub iframe');
            document.location.href="/sync";
        }
        $.get('/sync/accounts/logout/', {success: reloadSeahubIframe});
    }

    function onUnload () {
        desktopBusSubscriptions.forEach(function (sub) {
            sub.unsubscribe();
        });
        desktopBusSubscriptions.length = 0;
    }

    function activateNotification() {
        waitForElement('#msg-count', function (elem) {
            console.log('Going to modify notifications');
            $(elem).appendTo('body');
            elem.removeClass('fleft');
        }, 500, 10000);
    }

    function modifyUrlDownloadClient() {
        var url = getUrlDownloadClient();
        if (url) {
            $('#footer a:first').attr("href", url);
        }
    }

    function getUrlDownloadClient() {
        var userLang = getUserLanguage();
        var url = getValueLocalStorage('url_download_client');
        if (userLang === 'es') {
            var slashLast = url.lastIndexOf('/');
            var pathname = url.substr(slashLast);
            var host = url.substr(0, slashLast + 1);
            url = host + userLang + pathname;
        }
        return url;
    }

    function getUserLanguage() {
        var lang = "en";
        var itemUserInfo = getValueLocalStorage('userInfo');
        if (itemUserInfo) {
            var jsonUserInfo = JSON.parse(itemUserInfo);
            if ( jsonUserInfo && jsonUserInfo.hasOwnProperty("lang")) {
                lang = jsonUserInfo.lang;
            }
        }
        return lang;
    }

    function getValueLocalStorage(key) {
        var resultLocalStorage = null;
        var valueKey = window.localStorage.getItem(key);
        if (valueKey) {
            resultLocalStorage = valueKey
        }
        return resultLocalStorage;
    }

})();
