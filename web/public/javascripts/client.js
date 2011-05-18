var player_el;
var edit= false;

function truncate(el, len) {
    len = len || 200;
    if (el) {
	var trunc = el.innerHTML;
	if (trunc.length > len) {

	    /* Truncate the content of the P, then go back to the end of the
	       previous word to ensure that we don't truncate in the middle of
	       a word */
	    trunc = trunc.substring(0, len);
	    // trunc = trunc.replace(/\w+$/, '');
	    
	    /* Add an ellipses to the end and make it a link that expands
	       the paragraph back to its original size */
	    trunc += '...';
	    el.innerHTML = trunc;
	}
    }
}

var playlist_cycle=[];
var playing_index= -1;

function onYouTubePlayerReady(playerId) {
    var ytplayer = document.getElementById("player-e");
    $(ytplayer).attr("wmode", "transparent");
    $(ytplayer).css("position", "relative");
    ytplayer.addEventListener("onStateChange", "onytplayerStateChange");
}

function onytplayerStateChange(newState) {
    if (newState == 0) {
	play_next();
    }
}

function play(id) {
    $("#player-e").get(0).loadVideoById(id);
    $("li.video-item.playing").removeClass("playing");
    $("li.video-item[ytid="+id+"]").addClass("playing");
}

function play_next() {
    play(playlist_cycle[++playing_index]);
    if(playing_index == playlist_cycle.length) playing_index=0;
}

function calculate_playlist_cycle() {
    playlist_cycle=[];
    $("li.video-item").each(function() {
	playlist_cycle.push($(this).attr('ytid'));
    });
}


/* load_videos:
 * 
 *
 *
 */
function load_videos(playlist, callback) {
    var url= "/playlist/"+playlist+"/videos";
    if (edit) url+="?edit=true";
    url+= " ul,.more-videos";
    $("#playlist").load(url, function(data) {
	$("#playlist ul").show()
	    .sortable({containment:'parent',
		       update: function(e, ui) {
			   var position= (function() {
			       var pos= parseInt($(ui.item).prev().attr('pos'));
			       var old_pos= parseInt($(ui.item).attr('pos'));
			       if (pos < old_pos) pos += 1;
			       return pos||0;
			   })();
			   $.post("/playlist/"+current_playlist+"/sort", {video:$(ui.item).attr("id"), pos:position}, function() {
			       if (position==0) load_playlists();
			       load_videos(current_playlist);
			   });
		       }
		      });
	$("#playlist ul").disableSelection();

	// If there exists a player, then prepare playlist for playback
	if ($("#player").length > 0) calculate_playlist_cycle();

	var $video= $(data).find(".video-item:first");
	if ($video.length > 0) {
	    var ytid= $.trim($video.attr('ytid'));
	}
	if(callback) callback(ytid||null);
    });
}

function load_video(ytid) {
    if (!player_el) {
	load_player(ytid);
    } else {
	$(player_el).show();
	try {
	    player_el.cueVideoById(ytid);
	} catch(e) {
	}
    }
}

function load_playlist(playlist, callback) {
    load_videos(playlist, function(video) {
	if (video) {
	    load_video(video);
	} else {
	    if (player_el) $(player_el).hide();
	}
	if (callback) callback();
    });
}

function load_playlists() {
    var url= '/playlists';
    if (session.uid) url= '/'+session.uid+'/playlists';
    url += " li";
    $("#playlists ul").load(url, function() {
    });
}

function is_youtube_url(url) {
    var valid= $.trim(url).match(/^(http:\/\/)?www.youtube.com\/watch\?v\=(.+)$/);
    if(valid !== null) {
	var querystring= url.split("?")[1].split('&');
	$(querystring).each(function() {
	    var match= this.toString().match(/v\=(.+)/);
	    if (match !== null) valid= match;
	});
    }
    return valid;
}

function create_playlist(playlist) {
    if (!session.username) return false;
    var url= '/playlist';
    if (session.uid) url= '/'+session.username+'/playlists';
    if (playlist.title.length < 4) {
	alert("Playlist title must be at least 4 characters long");
    } else {
	$.post(url, {playlist:playlist}, function(playlist) {
	    window.location= "/"+session.username+"/"+playlist.id+"/new";
	});
    }
}

function delete_video(id) {
    $.ajax({type:'DELETE', url: '/playlist/'+current_playlist+'/videos/'+id, success: function(res) {
	load_videos(current_playlist);
    }});
}

function delete_playlist(playlist) {
    $.ajax({type:'DELETE', url: '/playlist/'+playlist, success: function(res) {
	load_playlists();
    }});
}

function add_video(url) {
    var valid_url= is_youtube_url(url);
    if (valid_url !== null) {
	var url= '/playlist/'+current_playlist+'/videos';
	// if (session.uid) {
	//     url= '/'+session.uid+'/'+current_playlist+'/videos';
	// }
	$.post(url, {v:valid_url[1]}, function(res) {
	    if (res == "ok") {
		load_playlist(current_playlist, function() {
		    if ($(".video-item").length == 1) {
			load_playlists();
		    }
		});
	    } else {
		if(res.error) {
		    alert(res.error);
		}
	    }
	});
    } else {
	alert("This doesn't seem to be a YouTube video");
    }
}

function add_video_to_playlist(ytid, playlist, callback) {
    var url= '/playlist/'+playlist+'/videos';
    $.post(url, {v:ytid}, function(res) {
	if (res == "ok") {
	    callback(res);
	} else {
	    if(res.error) {
		alert(res.error);
	    }
	}
    });
}

function add_video_by_ytid(ytid, playlist) {
    if(!playlist) playlist= current_playlist;
    var url= '/playlist/'+playlist+'/videos';
    $.post(url, {v:ytid}, function(res) {
	if (res == "ok") {
	    load_playlist(playlist);
	} else {
	    if(res.error) {
		alert(res.error);
	    }
	}
    });
}

function load_player(ytid) {
    var params = { allowScriptAccess: "always" };
    var atts = { id: "player-e" };
    if (!player_el) {
	swfobject.embedSWF("http://www.youtube.com/e/"+ytid+"?enablejsapi=1&playerapiid=ytplayer",
			   "ytapiplayer", "855", "510", "8", null, null, params, atts, function(e) {
			       player_el= $("#player-e").get(0);
			   });
    }
}

function show_ajax_loader() {
    $("#ajax-loader").show();
}

function hide_ajax_loader() {
    $("#ajax-loader").hide();
}

function hide_account_dropdown() {
    $(".account .dropdown").hide();
    $(".account").removeClass("on");
}

function login(credentials, callback) {
    $.post('/login', {session:credentials}, function(data) {
	if (data == 'ok') {
	    // window.location= "/me";
	    window.location= window.location.pathname;
 	} else if (data.session) {
	    session= data.session;
	} else if(data.signup) {
	    FB.api('/me', function(response) {
		$.post('/signup', {member:response}, function(data) {
		    if (data == 'ok') {
			window.location='/me';
		    }
		});
	    });
	} else {
	}
	if(callback) callback();
    });
}

$.widget("ui.playlists_manager", {
    _init: function() {
	var $el= this.element;
	var self= this;
	$el.find(".show").click(function(e) {
	    $(this).blur();
	    e.stopPropagation();
	    e.preventDefault();

	    if ($(this).hasClass("on")) {
		self._hide_playlists();
	    } else {
		self._show_playlists();
	    }
	});

	// Add Playlist prompt
	$el.find(".add").click(function(e) {
	    $(this).blur();
	    e.stopPropagation();
	    e.preventDefault();
	    $el.find('.add').addClass("on");
	    $el.find(".add-playlist").show();
	});

	
	// Ok btn on Add Playlist
	$el.find(".add-playlist a").click(function(e) {
	    $(this).blur();
	    e.stopPropagation();
	    e.preventDefault();
	    var playlist= {title:$el.find(".add-playlist input").val()};
	    create_playlist(playlist);
	});

	$(window).click(function(e) {
	    if ($(e.target).closest("#playlists").length == 0) {
		self._hide_playlists();
	    }
	});
    },
    _show_playlists: function() {
	var $el= this.element;
	$el.find('.show').addClass("on");
	$el.find("#playlists").slideDown();
    },
    _hide_playlists: function() {
	var $el= this.element;
	$el.find("#playlists").hide();
	$el.find(".show").removeClass("on");
    }
});

$.widget("ui.playlist", {
    _init: function() {
	var $el= this.element;
	$el.find(".more-videos").live("click", function(e) {
	    var count= $el.find(".video-item:visible").length;
	    $el.addClass("more");
	    $el.find(".video-item").slice(count, count+5).show();
	    if($el.find(".video-item:last").has(":visible").length == 1) {
		$(this).hide();
	    }
	    e.preventDefault();
	});
	$("li.video-item").live("click", function(e) {
	    var id= $(this).attr('ytid');
	    play(id);
	    playing_index= parseInt($(this).attr("pos"));
	    e.preventDefault();
	});
	$("li.video-item")
	    .live("mouseenter", 
		  function(e) {
		      $(this).find(".add-to-playlist").show();
		  })
	    .live("mouseleave",
		  function(e) {
		      $(this).find(".add-to-playlist").hide();		      
		  });

	$(".video-item .add-to-playlist")
	    .live("mouseenter", function(e) {
		e.preventDefault();
		e.stopPropagation();
		var $item= $(this).parent();
		if ($("#layouts #add-to-playlist-menu").length > 0) {
		    $layout= $("#layouts #add-to-playlist-menu");
		} else {
		    $layout= $el.find("#add-to-playlist-menu");
		}
		$layout.css({position: "absolute"});
		$item.append($layout.show());
	    });

	$(window).mouseleave(function(e) {
	    if ($(e.target).closest(".video-item").length == 0) {
		$el.find("#add-to-playlist-menu").hide();
	    }
	});
    }
});

function logout() {
    $.post('/logout', function(data) {
	session= {};
	window.location='/';
    });
}

jQuery(document).ready(function($) {
    // current_playlist= $(".playlist-item.on").attr('id');
    
    var $first_video= $("#playlist .video-item:first");
    if ($first_video.length > 0) {
	load_player($first_video.attr('ytid'));
    }
        
    $("#ajax-loader").ajaxStart(function() {
	$(this).show();
    });
    $("#ajax-loader").ajaxStop(function() {
	$(this).hide();
    });

    // Account box
    $(".account").click(function(e) {
	if ($(this).hasClass("on") && $(e.target).closest(".dropdown").length==0) {
	    hide_account_dropdown();
	    return false;
	}

	if ($(".account .dropdown").length > 0) {
	    $(this).addClass('on');
	    $(".account .dropdown").show();
	} else {
	    if ($(".account .sign-in").length > 0) {
		FB.login(function(response) {
		    // everything is done in event 'auth.login'
		}, {perms:'email, user_location, user_birthday, read_stream'});
	    }
	}
	// e.stopPropagation();
    });
    
    $(".account .member, .account .sign-in").click(function(e) {
	$(this).blur();
	e.preventDefault();
    });

    $(".account .logout").click(function(e) {
	FB.logout(function(response) { 
	});
    });

    $(window).click(function(e) {
	if (!($(e.target).hasClass("dropdown")) && $(e.target).closest(".account").length == 0) {
	    hide_account_dropdown();
	}
    });

    // Add video input field
    var default_video_input_text= "Enter a URL of a youtube video to add it to your playlist";
    $("#add-video input")
	.addClass("empty")
	.val(default_video_input_text)
	.focus(function() {$(this).val("");$(this).removeClass("empty")})
	.bind("change blur", function() {
	    var val= $.trim($(this).val());
	    if (val) {
		$(this).removeClass("empty");	
	    } else {
		$(this).addClass("empty");
		$(this).val(default_video_input_text);
	    }
	})
	.keyup(function(e) {
	    if (e.keyCode == 13) {
		$(this).blur();
		$("#add-video .add-btn").click();
	    }
	});



    // Make playlists sortable
    $(".info").playlists_manager();
    $("#playlists ul").sortable({containment:'parent',
				 update: function(e, ui) {
				 }
				});


    // Click Add Video Btn
    // - it should validate url input
    // - context: valid url 
    // -- it should load anonymous playlist if !session
    // -- it should (which?) playlist if session
    // -- it should load playlists panel (left) if session
    $("#add-video .add-btn").click(function(e) {
	add_video($("#add-video input").val());
	$("#add-video input").val("");
	e.preventDefault();
    });

    $("li.video-item .close").live("click", (function(e) {
	var id= $(this).closest(".video-item").attr("id");
	delete_video(id);
	e.preventDefault();
	e.stopPropagation();
    }));

    $("#add-playlist-btn a").click(function(e) {
	$(this).blur();
	var $layout= $(".playlist-item.layout").clone();
	$layout
	    .removeClass("layout")
	    .addClass("new")
	    .show()
	    .find(".title")
	      .hide();
	var $input= $("<input/>");
	$("#add-playlist-btn").addClass("on");
        $layout.find("a.info").append($input.attr("type", "text"));
	$("#playlists ul").append($layout);
	$layout
	    .find("input")
	      .focus()
	    .end()
	    .find(".edit")
	      .show()
	      .find(".cancel").click(function(e) {
		  $layout.fadeOut(function() { $(this).remove() });
		  $(this).blur();
		  e.preventDefault();
	      });

	$layout.find(".ok").click(function(e) {
	    $(this).blur();
	    e.preventDefault();
	    var title= $layout.find("input").val();
	    if ($.trim(title)) {
		var playlist= {title:title};
		create_playlist(playlist);
	    } else {
		alert("Enter a title for your playlist");
	    }
	});
	e.preventDefault();
    });

    $("#add-to-playlist-menu .playlist-item").live("click", function(e) {
	e.stopPropagation();
	e.preventDefault();
	var $video_item= $(this).closest(".video-item");
	var playlist= $(this).attr("id");
	add_video_to_playlist($video_item.attr("ytid"), playlist, function(data) {
	    alert("Video added to playlist "+$(this).find(".title").text());
	    $("#add-to-playlist-menu").hide();
	});
    });

    // $("#add-playlist-btn a").click();

    // $("#playlists li a").live("click", function(e) {
    // 	if ($(this).attr("href")=="#") {
    // 	    $(this).blur();
    // 	    var $item= $(this).closest(".playlist-item");
    // 	    current_playlist= $item.attr("id");
    // 	    $("#playlists li.on").removeClass('on');
    // 	    $item.addClass('on');
    // 	    $(".header .plist-title").text($(this).find(".title").text());
    // 	    load_playlist($item.attr("id"));
    // 	    e.preventDefault();
    // 	}
    // });

    $(".playlist-item .delete").live("click", function(e) {
	e.stopPropagation();
	e.preventDefault();
	var $item= $(this).closest(".playlist-item");
	var x= window.confirm("Are you sure?")
	if (x)
	    delete_playlist($item.attr("id"));
    });

    // Playlist
    $("#playlist ul").sortable({containment:'parent',
				update: function(e, ui) {
				    var position= (function() {
					var pos= parseInt($(ui.item).prev().attr('pos'));
					var old_pos= parseInt($(ui.item).attr('pos'));
					if (pos < old_pos) pos += 1;
					return pos||0;
				    })();
				    $.post("/playlist/"+current_playlist+"/sort", {video:$(ui.item).attr("id"), pos:position}, function() {
					if (position==0) load_playlists();
					load_videos(current_playlist);
				    });
				}
			       });
    
    // Home Page
    $(".create-playlist").click(function(e) {
	create_playlist({title:"Choose a title for your new playlist"});
	e.preventDefault();
    });


    /*
      *
      * Facebook Integration
      *
     */
    window.fbAsyncInit = function() {
	var appId= '270579051603';
	if (window.location.href.match(/plist\.tv/)) {
	    appId= '133998703298878';
	}

	FB.init({appId: appId, status: true, cookie: true, xfbml: true});

	FB.getLoginStatus(function(response) {
	    if (response.session) {
		// logged in and connected user, someone you know
		login(response.session, function() {
		    $(document).trigger("FB_ready");
		});
	    } else {
		if ($(".account .member").length > 0) {
		    logout();
		}
	    }
	});

	FB.Event.subscribe('auth.login', function(response) {	    
	    login(response.session);
	});
	FB.Event.subscribe('auth.logout', function(response) {
	    // logout();
	});

    };

    (function() {
    	var e = document.createElement('script');
    	e.type = 'text/javascript';
    	e.src = document.location.protocol +
    	    '//connect.facebook.net/en_US/all.js';
    	e.async = true;
    	document.getElementById('fb-root').appendChild(e);
    }());
});