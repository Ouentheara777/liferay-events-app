/*
 * Copyright 2015 Liferay, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

liferay.screens.contacts = new liferay.classes.window();
liferay.screens.contacts.className = 'liferay.screens.contacts';

liferay.screens.contacts.helpData = [
	{
		top: '50%',
		left: '10%',
		width: '85%',
		font: liferay.fonts.h4b,
		textAlign: Ti.UI.TEXT_ALIGNMENT_RIGHT,
		text: L('SCREEN_CONTACTS_HELP_1')
	},
	{
		view: {
			center : {
				x: '75%',
				y: '95%'
			},
			width: '40%',
			height: '9%',
			backgroundColor: 'transparent',
			borderWidth: '5dp',
			borderRadius: '3dp',
			borderColor: '#FF6666'
		}
	}
];

liferay.screens.contacts.render = function() {
	//Ti.API.info(this.className + ".render()");
	var self = this;

    this.listView = null;

    this.panelBg = Ti.UI.createView(liferay.settings.screens.all.layout.panelBg);

	this.loadContacts();

	var tagBtn = Titanium.UI.createView(liferay.settings.screens.contacts.buttons.tag);
	tagBtn.width = liferay.tools.getDp(liferay.settings.screens.contacts.buttons.tag.psize * Titanium.Platform.displayCaps.platformWidth);
	tagBtn.height = tagBtn.width;

	tagBtn.addEventListener('click', function(e) {

		liferay.tools.flashButton({
			control : e.source,
			onRestore : function() {
				var sponsor = null;
				liferay.data.currentEventData.sponsors.forEach(function(sponsorIt) {
					if (sponsorIt.type && sponsorIt.type == 'scan') {
						sponsor = sponsorIt;
					}
				});

				liferay.scan.doScan({
					message: sponsor ? String.format(L('SCAN_SPONSORED_BY'), sponsor.name) : L('SCAN_TITLE'),
					logo: sponsor ? sponsor.docmedia : null,
					onSuccess: function(result) {
						liferay.scan.parseBarcode(result, function(contact) {
							liferay.screens.contacts.saveNewContact(contact);
							var view = liferay.screens.contactsDetail;
							liferay.controller.open(view.render(), view, true);
							view.loadDetails(contact);
						}, function(err) {
							liferay.tools.alert(L('ALERT'), err);
						});

					},
					onFailure: function(err) {
						liferay.tools.alert(L('ALERT'), String.format(L('SCAN_UNABLE'), err));
					}
				});
			}
		});
	});

	var exportBtn = Titanium.UI.createView(liferay.settings.screens.contacts.buttons.exportBtn);
	exportBtn.width = liferay.tools.getDp(liferay.settings.screens.contacts.buttons.tag.psize * Titanium.Platform.displayCaps.platformWidth);
	exportBtn.height = exportBtn.width;

	exportBtn.addEventListener('click', function() {
		liferay.tools.flashButton({
			control : exportBtn,
			onRestore : function() {
				liferay.screens.contacts.askExport();
			}
		});
	});


	this.window = liferay.ui.makeWindow({
        backEnabled: true,
		// no swipe on android so scroll inertia preserved
		swipe: liferay.model.iOS ? true : false,
		footerButtons: [tagBtn, exportBtn],
		panelBg: this.panelBg
	});

	return this.window;
};

liferay.screens.contacts.getOverlay = function(sponsor) {

	var overlay = Ti.UI.createView({
		backgroundColor: 'transparent',
		top            : 0,
		left:0,
        bottom: 0,
        right: 0,
        opacity: 1,
        touchEnabled: false
	});

    var platHeight = Ti.Platform.displayCaps.platformHeight;
    var platWidth = Ti.Platform.displayCaps.platformWidth;

    var rectSize = platWidth - 20;
    var rectTop = (platHeight - rectSize) / 2;
    var rectBottom = rectTop +  rectSize;

    var shader = Ti.UI.createView({
        top: 20,
//        bottom: rectTop - 2,
        height: rectTop - 22,
        width: Ti.Platform.displayCaps.platformWidth *.63,
        backgroundColor: 'white',
        opacity: 1,
        borderColor: 'white',
        borderSize: '2px',
        borderWidth: '2px'
    });

    var l = Ti.UI.createLabel({
        text: String.format(L('SCAN_SPONSORED_BY'), sponsor.name),
        top:  rectBottom + 2,
        width: Ti.Platform.displayCaps.platformWidth *.9,
        height: Ti.Platform.displayCaps.platformHeight *.043,
        font: liferay.model.iPad ? liferay.fonts.h1b : liferay.fonts.h2b,
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
        backgroundColor: 'transparent',
        color: 'white'
    });


    var imgH = rectTop - 26;
    var imgW = imgH / .3;
	var image = Titanium.UI.createImageView({
		backgroundColor    : 'transparent',
        height: imgH,
        width: imgW,
		preventDefaultImage: false,
        image: liferay.settings.screens.contacts.defaultPicture
	});

	this.loadImage({
		imageView: image,
		url      : sponsor.docmedia,
        setImage: true
	});

    shader.add(image);
    overlay.add(shader);
    overlay.add(l);

	return overlay;
};

liferay.screens.contacts.refresh = function(options) {
	this.loadContacts();
};
liferay.screens.contacts.askExport = function() {
	var alertDialog = Titanium.UI.createAlertDialog({
		title : L('SCAN_EXPORT_TITLE'),
		message : L('SCAN_EXPORT_PROMPT'),
		buttonNames : [L('SCAN_EXPORT_CLIPBOARD'), L('SCAN_EXPORT_EMAIL'), L('CANCEL')]
	});
	alertDialog.addEventListener('click', function(e) {
		if (e.index == 0) {
			Ti.UI.Clipboard.setText(liferay.screens.contacts.getText("clipboard"));
		} else if (e.index == 1) {
			liferay.screens.contacts.emailContacts(liferay.screens.contacts.getText("email"));
		}
	});

	alertDialog.show();
};

liferay.screens.contacts.getText = function(format) {
	var merged = [];
	var data = [];

	// Merge user contacts with Liferay contacts
	if (liferay.data.currentEventData.contacts && liferay.data.currentEventData.contacts.length) {
		//Ti.API.info("pusing in liferay contacts: " + this.contactNames(liferay.data.contacts));
		merged.push.apply(merged, liferay.data.currentEventData.contacts);
	}
	merged.push.apply(merged, this.getEventContacts());

	merged.sortBy('readonly', 'firstname', 'lastname', 'companyname');
	//Ti.API.info("after sort: " + this.contactNames(this.mergedContacts));


	var result = "";
	if (format == 'email') {
		result += 	L('FMT_SCANDATE') + '\t' +
			L('FMT_NAME') + '\t' +
			L('FMT_TITLE') + '\t' +
			L('FMT_COMPANY') + '\t' +
			L('FMT_EMAIL') + '\t' +
			L('FMT_PHONE') + '\t' +
			L('FMT_ADDRESS') + '\t' +
            L('NOTES') + '\t' +
        L('FMT_URL') + '\n';
	}

	var localOff = new Date().getTimezoneOffset();
	var diff = (liferay.controller.selectedEvent.event_tz * 60) - localOff;
	for (var i = 0; i < merged.length; i++) {
		var ct = merged[i];
		var ctStr = "";
		var scanDateStr = L('FMT_NA');
		if (ct.id) {
			var scanDate = new Date(ct.id - (diff * 60 * 1000));
			scanDateStr = String.formatDate(scanDate, 'short') + ' ' + String.formatTime(scanDate, 'short');
		}

        var parts = [];
        if (ct.street) parts.push(ct.street);
        if (ct.city) parts.push(ct.city);
        if (ct.state) parts.push(ct.state);
        if (ct.zip) parts.push(ct.zip);

        if (format == 'email') {
			ctStr = scanDateStr + "\t" +
				ct.firstname + " " + ct.lastname + "\t" +
				(ct.title?ct.title:L('FMT_UNKNOWN')) + "\t" +
				(ct.companyname?ct.companyname:L('FMT_UNKNOWN')) + "\t" +
				(ct.email?ct.email:L('FMT_UNKNOWN')) + "\t" +
				(ct.phone?ct.phone:L('FMT_UNKNOWN')) + "\t" +
                parts.join(', ') + "\t"+
                (ct.url?ct.url:L('FMT_UNKNOWN')) + " \t" +
            (ct.notes?ct.notes:L('FMT_UNKNOWN')) + " \n";
		} else if (format == 'clipboard') {
			ctStr = L('FMT_SCANDATE') + ': ' + scanDateStr + "\n" +
				L('FMT_NAME') + ': ' + ct.firstname + " " + ct.lastname + "\n" +
				L('FMT_TITLE') + ': ' + (ct.title?ct.title:L('FMT_UNKNOWN')) + "\n" +
				L('FMT_COMPANY') + ': ' + (ct.companyname?ct.companyname:L('FMT_UNKNOWN')) + "\n" +
				L('FMT_EMAIL') + ': ' + (ct.email?ct.email:L('FMT_UNKNOWN')) + "\n" +
				L('FMT_PHONE') + ': ' + (ct.phone?ct.phone:L('FMT_UNKNOWN')) + "\n" +
				L('FMT_ADDR') + ': ' + parts.join(', ') + "\n" +
                L('NOTES') + ': ' + (ct.notes?ct.notes:L('FMT_UNKNOWN')) + "\n"+
            L('FMT_URL') + ': ' + (ct.url?ct.url:L('FMT_UNKNOWN')) + "\n\n";
		}
		result += ctStr;
	}
	return result;

};

liferay.screens.contacts.emailContacts = function(text) {
	var emailDialog = Titanium.UI.createEmailDialog();
	if (!emailDialog.isSupported()) {
		liferay.tools.alert(L('ALERT'), L('SCAN_EMAIL_UNSUP'));
		return;
	}
	emailDialog.setSubject(String.format(L('SCAN_EMAIL_SUBJ'), liferay.controller.selectedEvent.title,liferay.controller.selectedEvent.location_label ));
	emailDialog.setMessageBody(L('SCAN_EMAIL_SEE_ATTACHMENT'));
	// write tsv
	var folder = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory);
	if (!folder.exists()) {
		folder.createDirectory();
		folder.remoteBackup = false;
	}
	var file = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, liferay.settings.screens.contacts.contactsTSVFile);
	file.write(text);
	file.remoteBackup = false;
	//Ti.API.info("contacts after load: " + this.contactNames(this.contacts));

	// attach a file
	emailDialog.addAttachment(file);

	emailDialog.addEventListener('complete', function(e) {
		if (!e.success) {
			if (e.result == emailDialog.FAILED) {
				liferay.tools.alert(L('ALERT'), L('SCAN_EMAIL_FAILED'));
			}
		} else {
			if (e.result == emailDialog.SENT) {
                liferay.tools.toastNotification(null, L('SCAN_EMAIL_SENT'));
			}
		}
	});
	emailDialog.open();
};

liferay.screens.contacts.loadContacts = function() {

	var file = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, liferay.settings.screens.contacts.contactsFile);

	if (file.exists()) {
        try {
            var newContacts = JSON.parse(file.read());
            if (newContacts) {
                this.contacts = newContacts;
            } else {
            }
        } catch (ex) {
            // contacts file unreadable, abort!
            console.log("################################ CONTACTS FILE COULD NOT BE READ, ABORTING");
            return;
        }
	} else {
        if (this.contacts) {
            if (this.contacts.length <= 0) {
                this.contacts = [];
            } else {

            }
        } else {
            this.contacts = [];
        }
    }

    this.displayContacts();

};

liferay.screens.contacts.contactNames = function(cts) {
	var sb = "[";
	for (var i = 0; i < cts.length; i++) {
		var ct = cts[i];
		sb += (ct.firstname + " " + ct.lastname + "{" + ct.id + ", readonly=" + ct.readonly + "}");
		if (i < (cts.length - 1)) {
			sb += ", ";
		}
	}
	sb += "]";
	return sb;
}

liferay.screens.contacts.saveContacts = function() {
	//Ti.API.info(this.className + ".saveContacts()");
	var folder = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory);
	if (!folder.exists()) {
		folder.createDirectory();
		folder.remoteBackup = true;
	}
	var file = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, liferay.settings.screens.contacts.contactsFile);
	file.write(JSON.stringify(this.contacts));
	file.remoteBackup = true;

    // make time-based backup
    var backupFile = "backup" + new Date().getTime() + "." + liferay.settings.screens.contacts.contactsFile;
    file = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, backupFile);
    res = file.write(JSON.stringify(this.contacts));
    file.remoteBackup = true;

};

liferay.screens.contacts.getEventContacts = function() {
	for (var i = 0; i < this.contacts.length; i++) {
		if (this.contacts[i].eventId == liferay.controller.selectedEvent.eventid) {
			return this.contacts[i].contacts;
		}
	}
	return [];
};

liferay.screens.contacts.displayContacts = function() {

	if (!this.panelBg) {
		// ui not initialized
		return;
	}
	//Ti.API.info(this.className + ".displayContacts()");
	var self = this;

	this.mergedContacts = [];
	var data = [];

    if (this.listViewSection) {
        this.listViewSection.setItems([], { animation: true });
    }

    // Merge user contacts with Liferay contacts
	if (liferay.data.currentEventData.contacts && liferay.data.currentEventData.contacts.length) {
		//Ti.API.info("pusing in liferay contacts: " + this.contactNames(liferay.data.contacts));
		this.mergedContacts.push.apply(this.mergedContacts, liferay.data.currentEventData.contacts);
	}
	this.mergedContacts.push.apply(this.mergedContacts, this.getEventContacts());

	this.mergedContacts.sortBy('-readonly', 'firstname', 'lastname', 'companyname');

    if (!this.mergedContacts || !this.mergedContacts.length) {
        return;
    }

    var capsHeight = Titanium.Platform.displayCaps.platformHeight;
	var rowHeight = liferay.tools.getDp(capsHeight * .115);

    this.mergedContacts.forEach(function(contact) {

        var dataItem = {
            image: {
                image: liferay.screens.contacts.getImage(contact)
            },
            title: {
                text: contact.firstname + ' ' + contact.lastname
            },
            properties: {
                itemId: contact.uuid,
                height: rowHeight
            }
        };

        if (contact.companyname) {
            dataItem.template = 'with_subtitle';
            dataItem.subtitle = {
                text: contact.companyname.toUpperCase()
            }
        }

        data.push(dataItem);
    });

    if (!this.listViewSection) {
        this.listViewSection = Ti.UI.createListSection({
			headerTitle: L('CONTACTS')
		});
    }

    this.listViewSection.setItems(data);

    if (!this.listView) {
        this.listView = Ti.UI.createListView({
            templates: liferay.list_templates.list,
            defaultItemTemplate: 'base'
        });
        this.listView.setSections([this.listViewSection]);
        this.listView.addEventListener('itemclick', function(e) {

			var view = liferay.screens.contactsDetail;
			liferay.controller.open(view.render(), view, true);
			view.loadDetails(liferay.screens.contacts.mergedContacts[e.itemIndex]);
        });
        this.panelBg.add(this.listView);
    }



};

liferay.screens.contacts.getImage = function(contact) {

		if (!contact.picture) {
			return liferay.settings.screens.contacts.defaultPicture;
		}

    var lcl = liferay.screens.contacts.getLocalImage({
        url: contact.picture
    });

    if (lcl) {
        return lcl;
    } else {
        var tmpView = Ti.UI.createImageView();
        liferay.screens.contacts.loadImage({
            url: contact.picture,
            imageView: tmpView,
            setImage: true,
            onLoad: function (imgView) {
                liferay.screens.contacts.setListImage(contact, imgView.image);
            }
        });
        return liferay.settings.screens.contacts.defaultPicture;
    }
};

liferay.screens.contacts.setListImage = function(contact, img) {
    if (!liferay.screens.contacts.listViewSection) {
        return;
    }
    var items = liferay.screens.contacts.listViewSection.getItems();
    for (var i = 0; i < items.length; i++) {
        if (items[i] && items[i].properties && items[i].properties.itemId == contact.uuid) {
            items[i].image.image = img;
					liferay.screens.contacts.listViewSection.updateItemAt(i, items[i], {animated: true});
            break;
        }
    }

};

liferay.screens.contacts.saveNewContact = function(contact) {
	//Ti.API.info(this.className + ".saveNewContact()");
	contact.id = new Date().getTime();
	for (var i = 0; i < this.contacts.length; i++) {
		if (this.contacts[i].eventId == liferay.controller.selectedEvent.eventid) {
			this.contacts[i].contacts.push(contact);
			this.saveContacts();
			this.loadContacts();
			return;
		}
	}

	// no event node, so make one
	this.contacts.push({
		eventId : liferay.controller.selectedEvent.eventid,
		contacts : [contact]
	});
	this.saveContacts();
	this.loadContacts();
};

liferay.screens.contacts.deleteContact = function(id) {
	//Ti.API.info(this.className + ".deleteContact()");

	for (var i = 0; i < this.contacts.length; i++) {
		if (this.contacts[i].eventId == liferay.controller.selectedEvent.eventid) {
			var contacts = this.contacts[i].contacts;
			for (var j = 0; j < contacts.length; j++) {
				if (contacts[j].id == id) {
					contacts.splice(j, 1);
					this.saveContacts();
					this.loadContacts();
					return;
				}
			}
		}
	}
};

//Ti.API.info("contacts.js loaded");

