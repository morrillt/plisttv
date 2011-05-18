class PlaylistsController < ApplicationController
  before_filter :valid_member?, :only => [:create, :edit, :save, :new]
  before_filter :discard_new, :except => [:new, :save]
  skip_before_filter :require_user, :only => [:index, :show]

  # GET /:member/playlists
  def index
    @editable= true
    @member= current_member
    @playlist_member= @member

    @playlists= @member.playlists
    @on= @playlists.first

    respond_to do |format|
      format.html { render :partial => "playlists/list" }
    end
  end

  def new
    @new= true
    edit
  end

  def save
    playlist= Playlist.find(session[:new])
    session[:new]= nil
    redirect_to "/#{current_member.username}/#{playlist.id}"
  end

  def create
    a= current_member.playlists << Playlist.new({:title=>params[:playlist]['title'], :videos => []})
    respond_to do |format|
      format.json { render :json => {:id => a[0]._id } }
    end
  end

  def show
    @member= current_member if session[:member]
    @editable= true
    @playlist_member= @member ? @member : nil
    if !@playlist_member || (params[:member] != @member.username)
      @playlist_member= Member.first(:conditions => {:username => params[:member]})
      @editable= false
    end

    if @playlist_member
      @playlists= @playlist_member.playlists
      @playlist= Playlist.find(params[:playlist])
      @videos= @playlist.list_videos
      @on= @playlist
      
      respond_to do |format|
        format.html { render "index/index" }
      end
    else
      if @member
        redirect_to "/#{@member.username}"
      else
        redirect_to "/"
      end
    end
  end

  def update
    @playlist= Playlist.find(params[:playlist])
    if @playlist
      @playlist.update_attributes(params[:data])
    end
    respond_to do |format|
      format.html { render :text => "ok" }
    end
  end

  def edit
    @editing= true
    @editable= true
    @playlist_member= current_member
    @suggestions= current_member.suggestions
    @playlists= @playlist_member.playlists
    @playlist= Playlist.find(params[:playlist])
    @on= @playlist
    @videos= @playlist.list_videos
    if @new
      session[:new]= @playlist.id
    end

    respond_to do |format|
      format.html { render "edit" }
    end
  end

  private
  def valid_member?
    @member= current_member
    unless @member.username == params[:member]
      respond_to do |format|
        format.html { render :text => "i don't know who thou art!" }
      end
    end
  end
end
