class ApplicationController < ActionController::Base
  protect_from_forgery
  before_filter :require_user
  helper_method :current_member

  protected
  def current_member
    Member.find(session[:member])
  end

  private
  def discard_new
    # session[:new]= nil
    if session[:new]
      Playlist.find(session[:new]).delete
      session[:new]= nil
    end
  end

  def require_user
    # should test for session expiration
    if !session
      respond_to do |format|
        format.html {render :text => "fail"}
      end
    else
      if !session[:fbsession]
        respond_to do |format|
          format.html {render :text => "fail"}
        end
      end
    end
  end
end
