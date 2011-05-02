class PlaylistsController < ApplicationController
  before_filter :valid_member?

  # GET /:member/playlists
  def index
    @playlists= @member.playlists
    @on= @playlists.first

    respond_to do |format|
      format.html { render :partial => "playlists/list" }
    end
  end

  def create
    member= Member.find(session[:member])
    member.playlists << Playlist.new({:title=>params[:playlist]['title']})
    respond_to do |format|
      format.html { render :text => "ok" }
    end
  end

  private
  def valid_member?
    @member= Member.find(session[:member])
    unless @member.fb_uid == params[:member]
      respond_to do |format|
        format.html { render :text => "i don't know who thou art!" }
      end
    end
  end
end
