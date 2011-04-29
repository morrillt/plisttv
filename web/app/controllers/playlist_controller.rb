class PlaylistController < ActionController::Base
  before_filter :require_user, :except => :index

  # GET /playlist
  # Only for anonymous sessions, that is, not FB connected
  def index
    playlist_videos= session[:playlist].videos
    videos= Video.find(playlist_videos)
    @videos= []

    playlist_videos.each do |pv|
      @videos << videos.detect {|v| pv == v._id }
    end

    respond_to do |format|
      format.html { render :partial => "index/playlist" }
    end
  end

  # GET /:user/playlists
  def list
    @playlists= User.playlists
    respond_to do |format|
      format.html { render :partial => "playlist/list" }
    end
  end

  # GET /:user/:playlist
  def show
    playlist= 
    playlist_videos= playlist.videos
    videos= Video.find(playlist_videos)
    @videos= []

    playlist_videos.each do |pv|
      @videos << videos.detect {|v| pv == v._id }
    end

    respond_to do |format|
      format.html { render :partial => "index/playlist" }
    end
  end

  def create
    if (Video.exists?(:conditions=>{:ytid => params[:v]}))
    else
      yt_feed= RestClient.get("http://gdata.youtube.com/feeds/api/videos/#{params[:v]}?v=2&alt=json")
      yt_video= JSON.parse(yt_feed)

      title= yt_video["entry"]["title"]["$t"]
      authors= [];
      yt_video["entry"]["author"].each do |a|
        author= {'name' => a["name"]["$t"], 'uri' => a["uri"]["$t"]}
        authors << author
      end

      video= Video.create({:ytid => params[:v], :title=>title, :authors=>authors, :playlist_id=> 1})
      session[:playlist].videos << video._id
      session[:playlist].save
    end
    respond_to do |format|
      format.html { render :text => "ok"}
    end
  end

  def destroy
    session[:playlist].remove_video(params[:id])
    respond_to do |format|
      format.html { render :text => "ok" }
    end
  end

  def sort
    if params[:video]
      if params[:pos]
        sort= session[:playlist].sort(params[:video], params[:pos])
      end
    else
    end
    respond_to do |format|
      format.html {render :text=>sort}
    end
  end
end
